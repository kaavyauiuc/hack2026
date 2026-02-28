import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import MicButton, { useAudioRecorder } from '../components/AudioRecorder.jsx'
import ChatBubble from '../components/ChatBubble.jsx'
import { startSession, endSession, sendMessage, transcribeAudio, synthesizeSpeech } from '../services/api.js'

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)',
  },
  header: {
    padding: '16px 24px',
    background: 'rgba(18,18,31,0.9)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid #1e293b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  lessonInfo: { color: '#64748b', fontSize: 13 },
  endBtn: {
    padding: '8px 16px',
    background: 'transparent',
    border: '1px solid #334155',
    borderRadius: 8,
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: 13,
  },
  chatArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 16px',
    maxWidth: 720,
    width: '100%',
    margin: '0 auto',
  },
  bottom: {
    padding: '20px 24px',
    background: 'rgba(18,18,31,0.9)',
    backdropFilter: 'blur(10px)',
    borderTop: '1px solid #1e293b',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  status: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  modal: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  modalCard: {
    background: '#12121f',
    border: '1px solid #1e293b',
    borderRadius: 20,
    padding: 32,
    maxWidth: 480,
    width: '90%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#e2e8f0',
    marginBottom: 16,
  },
  cefrBadge: {
    display: 'inline-block',
    padding: '6px 14px',
    borderRadius: 20,
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: '#fff',
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 16,
  },
  sectionTitle: { color: '#94a3b8', fontSize: 13, marginBottom: 6, marginTop: 16 },
  tag: {
    display: 'inline-block',
    padding: '4px 10px',
    background: '#1e293b',
    borderRadius: 6,
    fontSize: 12,
    color: '#cbd5e1',
    margin: '3px 3px 3px 0',
  },
  modalBtns: { display: 'flex', gap: 12, marginTop: 24 },
  primaryBtn: {
    flex: 1,
    padding: '12px',
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    border: 'none',
    borderRadius: 10,
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 14,
  },
  secondaryBtn: {
    flex: 1,
    padding: '12px',
    background: 'transparent',
    border: '1px solid #334155',
    borderRadius: 10,
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: 14,
  },
}

export default function Session() {
  const navigate = useNavigate()
  const userId = localStorage.getItem('user_id')
  const targetLang = localStorage.getItem('target_language') || 'spa'

  const [sessionId, setSessionId] = useState(null)
  const [lessonTitle, setLessonTitle] = useState('')
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState('Starting session...')
  const [isBusy, setIsBusy] = useState(true)
  const [evaluation, setEvaluation] = useState(null)

  const chatBottomRef = useRef(null)
  const currentAudioRef = useRef(null)

  // Redirect if no user
  useEffect(() => {
    if (!userId) navigate('/onboarding')
  }, [userId, navigate])

  // Scroll to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Start session on mount
  useEffect(() => {
    async function init() {
      try {
        const data = await startSession(userId)
        setSessionId(data.session_id)
        setLessonTitle(data.lesson_title)
        const msgId = Date.now()
        setMessages([{ id: msgId, speaker: 'tutor', text: data.tutor_message, translation: data.tutor_translation }])
        fetchTTS(msgId, data.tutor_message)
        setStatus('Tap the mic to speak')
        setIsBusy(false)
      } catch (e) {
        setStatus('Failed to start session. Check backend connection.')
        setIsBusy(false)
      }
    }
    if (userId) init()
  }, [userId])

  function addMessage(speaker, text) {
    setMessages((prev) => [...prev, { speaker, text, id: Date.now() + Math.random() }])
  }

  function fetchTTS(msgId, text) {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, audioLoading: true } : m))
    synthesizeSpeech(text, targetLang)
      .then(url => setMessages(prev => prev.map(m => m.id === msgId ? { ...m, audioUrl: url, audioLoading: false } : m)))
      .catch(() => setMessages(prev => prev.map(m => m.id === msgId ? { ...m, audioLoading: false } : m)))
  }

  function handlePlay(audioUrl) {
    if (currentAudioRef.current) currentAudioRef.current.pause()
    const audio = new Audio(audioUrl)
    currentAudioRef.current = audio
    audio.play()
  }

  // Handle audio blob from recorder
  const handleAudioBlob = useCallback(async (blob) => {
    if (!sessionId) return
    setIsBusy(true)
    setStatus('Transcribing...')

    try {
      const transcript = await transcribeAudio(blob, targetLang)
      if (!transcript.trim()) {
        setStatus('Could not hear you. Try again.')
        setIsBusy(false)
        return
      }

      addMessage('user', transcript)
      setStatus('AI is thinking...')

      // Stream tutor response
      const reader = await sendMessage(sessionId, userId, transcript)
      const decoder = new TextDecoder()
      let tutorText = ''

      // Add empty tutor bubble that we'll fill in
      const tutorMsgId = Date.now()
      setMessages((prev) => [...prev, { speaker: 'tutor', text: '', id: tutorMsgId }])

      let streamingStarted = false

      outer: while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const raw = decoder.decode(value, { stream: true })
        const lines = raw.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const chunk = line.slice(6)
            if (chunk === '[DONE]') {
              fetchTTS(tutorMsgId, tutorText)
              break outer
            }
            if (chunk.startsWith('[TRANSLATION]:')) {
              const translation = JSON.parse(chunk.slice('[TRANSLATION]:'.length))
              setMessages(prev => prev.map(m => m.id === tutorMsgId ? { ...m, translation } : m))
              // Tutor text is fully received — unlock mic now, don't wait for [DONE]
              setIsBusy(false)
              setStatus('Tap the mic to speak')
              continue
            }
            // First text chunk arriving — update status so user knows AI responded
            if (!streamingStarted) {
              streamingStarted = true
              setStatus('AI is responding...')
            }
            tutorText += JSON.parse(chunk)
            setMessages((prev) =>
              prev.map((m) => (m.id === tutorMsgId ? { ...m, text: tutorText } : m))
            )
          }
        }
      }
    } catch (e) {
      console.error(e)
      setStatus('Something went wrong. Try again.')
    } finally {
      setIsBusy(false)
    }
  }, [sessionId, userId, targetLang])

  const { isRecording, startRecording, stopRecording } = useAudioRecorder(handleAudioBlob)

  // Set busy immediately when recording stops so the mic is blocked before
  // the MediaRecorder blob arrives and handleAudioBlob kicks in.
  function handleStopRecording() {
    stopRecording()
    setIsBusy(true)
    setStatus('Processing...')
  }

  async function handleEndSession() {
    if (!sessionId) return
    setIsBusy(true)
    setStatus('Evaluating session...')
    try {
      const result = await endSession(sessionId, userId)
      setEvaluation(result)
    } catch (e) {
      setStatus('Failed to end session.')
      setIsBusy(false)
    }
  }

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.title}>LinguaAI</div>
          {lessonTitle && <div style={s.lessonInfo}>{lessonTitle}</div>}
        </div>
        <button style={s.endBtn} onClick={handleEndSession} disabled={isBusy || !sessionId}>
          End Session
        </button>
      </div>

      {/* Chat */}
      <div style={s.chatArea}>
        {messages.map((m) => (
          <ChatBubble
            key={m.id}
            speaker={m.speaker}
            text={m.text}
            translation={m.translation}
            audioLoading={m.audioLoading}
            onPlay={m.audioUrl ? () => handlePlay(m.audioUrl) : undefined}
          />
        ))}
        <div ref={chatBottomRef} />
      </div>

      {/* Mic + status */}
      <div style={s.bottom}>
        <MicButton
          isRecording={isRecording}
          onStart={startRecording}
          onStop={handleStopRecording}
          disabled={isBusy}
        />
        <div style={s.status}>{status}</div>
      </div>

      {/* Evaluation modal */}
      {evaluation && (
        <div style={s.modal}>
          <div style={s.modalCard}>
            <div style={s.modalTitle}>Session Complete!</div>
            <div style={s.cefrBadge}>{evaluation.cefr_estimate}</div>
            <p style={{ color: '#94a3b8', fontSize: 14 }}>
              Confidence: {Math.round((evaluation.confidence_score || 0) * 100)}%
            </p>

            {evaluation.achieved_objectives?.length > 0 && (
              <>
                <div style={s.sectionTitle}>Achieved</div>
                {evaluation.achieved_objectives.map((o, i) => (
                  <span key={i} style={{ ...s.tag, background: 'rgba(34,197,94,0.15)', color: '#86efac' }}>{o}</span>
                ))}
              </>
            )}

            {evaluation.weaknesses?.length > 0 && (
              <>
                <div style={s.sectionTitle}>Areas to improve</div>
                {evaluation.weaknesses.map((w, i) => (
                  <span key={i} style={s.tag}>{w}</span>
                ))}
              </>
            )}

            {evaluation.next_recommendation && (
              <>
                <div style={s.sectionTitle}>Next session</div>
                <p style={{ color: '#cbd5e1', fontSize: 14 }}>{evaluation.next_recommendation}</p>
              </>
            )}

            <div style={s.modalBtns}>
              <button style={s.primaryBtn} onClick={() => { setEvaluation(null); window.location.reload() }}>
                New Session
              </button>
              <button style={s.secondaryBtn} onClick={() => navigate('/dashboard')}>
                Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
