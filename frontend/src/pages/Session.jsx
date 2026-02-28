import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import MicButton, { useAudioRecorder } from '../components/AudioRecorder.jsx'
import ChatBubble from '../components/ChatBubble.jsx'
import { startSession, endSession, sendMessage, transcribeAudio, synthesizeSpeech } from '../services/api.js'

export default function Session() {
  const navigate = useNavigate()
  const userId = localStorage.getItem('user_id')
  const targetLang = localStorage.getItem('target_language') || 'spa'

  const [sessionId, setSessionId] = useState(null)
  const [lessonTitle, setLessonTitle] = useState('')
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState('Starting session…')
  const [isBusy, setIsBusy] = useState(true)
  const [evaluation, setEvaluation] = useState(null)

  const chatBottomRef = useRef(null)
  const currentAudioRef = useRef(null)

  useEffect(() => { if (!userId) navigate('/onboarding') }, [userId, navigate])
  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

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
      } catch {
        setStatus('Failed to start session. Check backend connection.')
        setIsBusy(false)
      }
    }
    if (userId) init()
  }, [userId])

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

  const handleAudioBlob = useCallback(async (blob) => {
    if (!sessionId) return
    setIsBusy(true)
    setStatus('Transcribing…')

    try {
      const transcript = await transcribeAudio(blob, targetLang)
      if (!transcript.trim()) {
        setStatus('Could not hear you. Try again.')
        setIsBusy(false)
        return
      }

      setMessages(prev => [...prev, { id: Date.now() + Math.random(), speaker: 'user', text: transcript }])
      setStatus('Tutor is thinking…')

      const reader = await sendMessage(sessionId, userId, transcript)
      const decoder = new TextDecoder()
      let tutorText = ''
      const tutorMsgId = Date.now()
      setMessages(prev => [...prev, { speaker: 'tutor', text: '', id: tutorMsgId }])
      let streamingStarted = false

      outer: while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const raw = decoder.decode(value, { stream: true })
        for (const line of raw.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const chunk = line.slice(6)
          if (chunk === '[DONE]') { fetchTTS(tutorMsgId, tutorText); break outer }
          if (chunk.startsWith('[TRANSLATION]:')) {
            const translation = JSON.parse(chunk.slice('[TRANSLATION]:'.length))
            setMessages(prev => prev.map(m => m.id === tutorMsgId ? { ...m, translation } : m))
            setIsBusy(false)
            setStatus('Tap the mic to speak')
            continue
          }
          if (!streamingStarted) { streamingStarted = true; setStatus('Responding…') }
          tutorText += JSON.parse(chunk)
          setMessages(prev => prev.map(m => m.id === tutorMsgId ? { ...m, text: tutorText } : m))
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

  function handleStopRecording() {
    stopRecording()
    setIsBusy(true)
    setStatus('Processing…')
  }

  async function handleEndSession() {
    if (!sessionId) return
    setIsBusy(true)
    setStatus('Evaluating session…')
    try {
      const result = await endSession(sessionId, userId)
      setEvaluation(result)
    } catch {
      setStatus('Failed to end session.')
      setIsBusy(false)
    }
  }

  return (
    <div className="grid-bg" style={s.page}>

      {/* Header */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.logo}>LinguaAI</span>
          {lessonTitle && <span style={s.lessonBadge}>{lessonTitle}</span>}
        </div>
        <button style={s.endBtn} onClick={handleEndSession} disabled={isBusy || !sessionId}>
          End session
        </button>
      </header>

      {/* Chat */}
      <div style={s.chatArea}>
        <div style={s.chatInner}>
          {messages.map(m => (
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
      </div>

      {/* Bottom bar */}
      <div style={s.bottom}>
        <MicButton
          isRecording={isRecording}
          onStart={startRecording}
          onStop={handleStopRecording}
          disabled={isBusy}
        />
        <div style={s.statusRow}>
          {isBusy && !isRecording && <span className="spinner" style={{ width: 12, height: 12, marginRight: 8 }} />}
          <span style={s.statusText}>{status}</span>
        </div>
      </div>

      {/* Evaluation modal */}
      {evaluation && (
        <div style={s.overlay}>
          <div className="card modal-enter" style={s.modal}>
            <div style={s.modalEyebrow}>Session complete</div>
            <div style={s.modalCefr}>{evaluation.cefr_estimate}</div>
            <div style={s.modalConf}>
              Confidence: {Math.round((evaluation.confidence_score || 0) * 100)}%
            </div>

            {evaluation.achieved_objectives?.length > 0 && (
              <div style={s.modalSection}>
                <div className="label-caps" style={{ marginBottom: 8 }}>Achieved</div>
                <div style={s.tagRow}>
                  {evaluation.achieved_objectives.map((o, i) => (
                    <span key={i} style={s.tagGreen}>{o}</span>
                  ))}
                </div>
              </div>
            )}

            {evaluation.weaknesses?.length > 0 && (
              <div style={s.modalSection}>
                <div className="label-caps" style={{ marginBottom: 8 }}>To improve</div>
                <div style={s.tagRow}>
                  {evaluation.weaknesses.map((w, i) => (
                    <span key={i} style={s.tag}>{w}</span>
                  ))}
                </div>
              </div>
            )}

            {evaluation.next_recommendation && (
              <div style={s.modalSection}>
                <div className="label-caps" style={{ marginBottom: 8 }}>Next session</div>
                <p style={s.recommendation}>{evaluation.next_recommendation}</p>
              </div>
            )}

            <div style={s.modalBtns}>
              <button style={s.btnPrimary} onClick={() => { setEvaluation(null); window.location.reload() }}>
                New session
              </button>
              <button style={s.btnSecondary} onClick={() => navigate('/dashboard')}>
                Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '14px 24px',
    borderBottom: '1px solid var(--border)',
    background: 'rgba(14,11,9,0.85)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  logo: {
    fontFamily: 'Fraunces, Georgia, serif',
    fontStyle: 'italic',
    fontSize: 16,
    fontWeight: 500,
    color: 'var(--text)',
    letterSpacing: '-0.01em',
  },
  lessonBadge: {
    fontSize: 11,
    color: 'var(--muted)',
    fontFamily: 'Overpass Mono, monospace',
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '3px 9px',
    maxWidth: 280,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  endBtn: {
    padding: '7px 14px',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--muted)',
    fontFamily: 'Overpass Mono, monospace',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'border-color 0.15s, color 0.15s',
  },
  chatArea: { flex: 1, overflowY: 'auto', padding: '28px 16px 12px' },
  chatInner: { maxWidth: 680, margin: '0 auto' },
  bottom: {
    padding: '20px 24px 28px',
    borderTop: '1px solid var(--border)',
    background: 'rgba(14,11,9,0.85)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
  },
  statusRow: { display: 'flex', alignItems: 'center' },
  statusText: {
    fontSize: 12,
    color: 'var(--muted)',
    fontFamily: 'Overpass Mono, monospace',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.72)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    padding: 20,
  },
  modal: {
    padding: '32px 28px 28px',
    maxWidth: 460,
    width: '100%',
  },
  modalEyebrow: {
    fontFamily: 'Overpass Mono, monospace',
    fontSize: 10,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    marginBottom: 10,
  },
  modalCefr: {
    fontFamily: 'Fraunces, Georgia, serif',
    fontSize: 64,
    fontWeight: 700,
    letterSpacing: '-0.04em',
    color: 'var(--accent)',
    lineHeight: 1,
    marginBottom: 6,
  },
  modalConf: {
    fontFamily: 'Overpass Mono, monospace',
    fontSize: 11,
    color: 'var(--muted)',
    marginBottom: 20,
  },
  modalSection: { marginBottom: 16 },
  tagRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  tag: {
    padding: '4px 10px',
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    fontSize: 11,
    color: 'var(--muted)',
    fontFamily: 'Overpass Mono, monospace',
  },
  tagGreen: {
    padding: '4px 10px',
    background: 'var(--sage-dim)',
    border: '1px solid rgba(78,142,110,0.3)',
    borderRadius: 6,
    fontSize: 11,
    color: 'var(--sage)',
    fontFamily: 'Overpass Mono, monospace',
  },
  recommendation: {
    fontSize: 13,
    color: 'var(--text)',
    lineHeight: 1.65,
    fontFamily: 'Overpass Mono, monospace',
  },
  modalBtns: { display: 'flex', gap: 10, marginTop: 24 },
  btnPrimary: {
    flex: 1,
    padding: '12px',
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 'var(--radius)',
    color: '#fff',
    fontFamily: 'Fraunces, Georgia, serif',
    fontStyle: 'italic',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(212,112,42,0.28)',
  },
  btnSecondary: {
    flex: 1,
    padding: '12px',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--muted)',
    fontFamily: 'Overpass Mono, monospace',
    fontSize: 12,
    cursor: 'pointer',
  },
}
