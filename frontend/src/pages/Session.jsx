import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import MicButton, { useAudioRecorder } from '../components/AudioRecorder.jsx'
import ChatBubble from '../components/ChatBubble.jsx'
import AvatarPanel from '../components/AvatarPanel.jsx'
import { startSession, endSession, sendMessage, transcribeAudio, synthesizeSpeech, animateAvatar, getUserProfile } from '../services/api.js'

const LANG_ABBR = {
  spa: 'ES', fra: 'FR', deu: 'DE', cmn: 'ZH', jpn: 'JA',
  por: 'PT', hin: 'HI', eng: 'EN',
}

const NATIVE_PREFIX = '[NATIVE_INPUT]: '

export default function Session() {
  const navigate = useNavigate()
  const userId = localStorage.getItem('user_id')
  const [targetLang, setTargetLang] = useState(localStorage.getItem('target_language') || 'spa')
  const [nativeLang, setNativeLang] = useState(localStorage.getItem('native_language') || 'eng')

  const [sessionId, setSessionId] = useState(null)
  const [lessonTitle, setLessonTitle] = useState('')
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState('Starting session…')
  const [isBusy, setIsBusy] = useState(true)
  const [evaluation, setEvaluation] = useState(null)

  const [textInput, setTextInput] = useState('')
  const [nativeLangMode, setNativeLangMode] = useState(false)
  const [playingId, setPlayingId] = useState(null)

  // Avatar video state
  const [avatarVideoUrl, setAvatarVideoUrl] = useState(null)
  const [avatarVideoKey, setAvatarVideoKey] = useState(0)
  const [avatarLoading, setAvatarLoading] = useState(false)

  const chatBottomRef = useRef(null)
  const currentAudioRef = useRef(null)

  useEffect(() => { if (!userId) navigate('/onboarding') }, [userId, navigate])
  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    async function init() {
      try {
        try {
          const profile = await getUserProfile(userId)
          const lang = profile.active_language ?? targetLang
          setTargetLang(lang)
          localStorage.setItem('target_language', lang)
          if (profile.native_language) {
            setNativeLang(profile.native_language)
            localStorage.setItem('native_language', profile.native_language)
          }
        } catch (_) {}

        const data = await startSession(userId)
        setSessionId(data.session_id)
        setLessonTitle(data.lesson_title)
        const msgId = Date.now()
        setMessages([{ id: msgId, speaker: 'tutor', text: data.tutor_message, translation: data.tutor_translation }])
        fetchTTS(msgId, data.tutor_message)
        setStatus('tap mic or type')
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
      .then(({ url, blob }) => {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, audioUrl: url, audioLoading: false } : m))
        // Kick off avatar video generation in parallel — non-blocking
        setAvatarLoading(true)
        animateAvatar(blob)
          .then(videoUrl => {
            setAvatarVideoUrl(videoUrl)
            setAvatarVideoKey(k => k + 1)
          })
          .catch(e => console.warn('[avatar]', e))
          .finally(() => setAvatarLoading(false))
      })
      .catch(() => setMessages(prev => prev.map(m => m.id === msgId ? { ...m, audioLoading: false } : m)))
  }

  function handlePlay(msgId, audioUrl) {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current.onended = null
    }
    const audio = new Audio(audioUrl)
    currentAudioRef.current = audio
    setPlayingId(msgId)
    audio.onended = () => setPlayingId(null)
    audio.play()
  }

  function handlePause() {
    currentAudioRef.current?.pause()
    setPlayingId(null)
  }

  // Shared stream processor used by both speech and text paths
  async function processTutorStream(reader) {
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
          setStatus('tap mic or type')
          continue
        }
        if (!streamingStarted) { streamingStarted = true; setStatus('responding…') }
        tutorText += JSON.parse(chunk)
        setMessages(prev => prev.map(m => m.id === tutorMsgId ? { ...m, text: tutorText } : m))
      }
    }
  }

  const handleAudioBlob = useCallback(async (blob) => {
    if (!sessionId) return
    setIsBusy(true)
    setStatus('transcribing…')

    try {
      const transcript = await transcribeAudio(blob, targetLang)
      if (!transcript.trim()) {
        setStatus('could not hear you. try again.')
        setIsBusy(false)
        return
      }

      setMessages(prev => [...prev, { id: Date.now() + Math.random(), speaker: 'user', text: transcript }])
      setStatus('tutor is thinking…')

      const reader = await sendMessage(sessionId, userId, transcript)
      await processTutorStream(reader)
    } catch (e) {
      console.error(e)
      setStatus('something went wrong. try again.')
    } finally {
      setIsBusy(false)
    }
  }, [sessionId, userId, targetLang])

  async function handleTextSend() {
    const raw = textInput.trim()
    if (!raw || !sessionId || isBusy) return

    const displayText = raw
    const messageText = nativeLangMode ? `${NATIVE_PREFIX}${raw}` : raw

    setTextInput('')
    setIsBusy(true)
    setStatus('tutor is thinking…')
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), speaker: 'user', text: displayText }])

    try {
      const reader = await sendMessage(sessionId, userId, messageText)
      await processTutorStream(reader)
    } catch (e) {
      console.error(e)
      setStatus('something went wrong. try again.')
    } finally {
      setIsBusy(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleTextSend()
    }
  }

  const { isRecording, startRecording, stopRecording } = useAudioRecorder(handleAudioBlob)

  function handleStopRecording() {
    stopRecording()
    setIsBusy(true)
    setStatus('processing…')
  }

  async function handleEndSession() {
    if (!sessionId) return
    setIsBusy(true)
    setStatus('evaluating session…')
    try {
      const result = await endSession(sessionId, userId)
      setEvaluation(result)
    } catch {
      setStatus('Failed to end session.')
      setIsBusy(false)
    }
  }

  const targetAbbr = LANG_ABBR[targetLang] ?? targetLang.toUpperCase()
  const nativeAbbr = LANG_ABBR[nativeLang] ?? nativeLang.toUpperCase()

  return (
    <div style={s.page}>

      {/* Header */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.logo}>
            <em style={s.logoL}>Lingua</em><span style={s.logoR}>AI</span>
          </span>
          {lessonTitle && <span style={s.lessonBadge}>{lessonTitle}</span>}
        </div>
        <button style={s.endBtn} onClick={handleEndSession} disabled={isBusy || !sessionId}>
          end session
        </button>
      </header>

      {/* Main: avatar + chat side-by-side */}
      <div style={s.mainArea}>
        {/* Avatar column */}
        <div style={s.avatarCol}>
          <AvatarPanel
            videoUrl={avatarVideoUrl}
            videoKey={avatarVideoKey}
            isLoading={avatarLoading}
          />
        </div>

        {/* Chat column */}
        <div style={s.chatArea}>
          <div style={s.chatInner}>
            {messages.map(m => (
              <ChatBubble
                key={m.id}
                speaker={m.speaker}
                text={m.text}
                translation={m.translation}
                audioLoading={m.audioLoading}
                isPlaying={playingId === m.id}
                onPlay={m.audioUrl && playingId !== m.id ? () => handlePlay(m.id, m.audioUrl) : undefined}
                onPause={playingId === m.id ? handlePause : undefined}
              />
            ))}
            <div ref={chatBottomRef} />
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={s.bottom}>
        <div style={s.inputRow}>
          <MicButton
            isRecording={isRecording}
            onStart={startRecording}
            onStop={handleStopRecording}
            disabled={isBusy}
          />
          <button
            style={s.langToggle(nativeLangMode)}
            onClick={() => setNativeLangMode(v => !v)}
            disabled={isBusy}
            title={nativeLangMode ? `Switch to ${targetAbbr} input` : `Switch to ${nativeAbbr} input`}
          >
            <span style={s.toggleLang(!nativeLangMode)}>{targetAbbr}</span>
            <span style={s.toggleArrow}>↔</span>
            <span style={s.toggleLang(nativeLangMode)}>{nativeAbbr}</span>
          </button>
          <input
            style={s.textInput}
            type="text"
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={nativeLangMode ? `type in ${nativeAbbr}…` : `type in ${targetAbbr}…`}
            disabled={isBusy}
          />
          <button
            style={s.sendBtn(!!textInput.trim() && !isBusy)}
            onClick={handleTextSend}
            disabled={!textInput.trim() || isBusy}
          >
            ↑
          </button>
        </div>
        <div style={s.statusRow}>
          {isBusy && !isRecording && <span className="spinner" style={{ width: 11, height: 11, marginRight: 8 }} />}
          <span style={s.statusText}>{status}</span>
        </div>
      </div>

      {/* Evaluation modal */}
      {evaluation && (
        <div style={s.overlay}>
          <div className="card modal-enter" style={s.modal}>
            <div style={s.modalEyebrow}>session complete</div>
            <div style={s.modalCefr}>{evaluation.cefr_estimate}</div>
            <div style={s.modalConf}>
              confidence: {Math.round((evaluation.confidence_score || 0) * 100)}%
            </div>

            {evaluation.achieved_objectives?.length > 0 && (
              <div style={s.modalSection}>
                <div className="label-caps" style={{ marginBottom: 8 }}>achieved</div>
                <div style={s.tagRow}>
                  {evaluation.achieved_objectives.map((o, i) => (
                    <span key={i} style={s.tagGreen}>{o}</span>
                  ))}
                </div>
              </div>
            )}

            {evaluation.weaknesses?.length > 0 && (
              <div style={s.modalSection}>
                <div className="label-caps" style={{ marginBottom: 8 }}>to improve</div>
                <div style={s.tagRow}>
                  {evaluation.weaknesses.map((w, i) => (
                    <span key={i} style={s.tagBlue}>{w}</span>
                  ))}
                </div>
              </div>
            )}

            {evaluation.next_recommendation && (
              <div style={s.modalSection}>
                <div className="label-caps" style={{ marginBottom: 8 }}>next session</div>
                <p style={s.recommendation}>{evaluation.next_recommendation}</p>
              </div>
            )}

            <div style={s.modalBtns}>
              <button style={s.btnPrimary} onClick={() => { setEvaluation(null); window.location.reload() }}>
                <em style={{ fontStyle: 'italic' }}>new session</em>
              </button>
              <button style={s.btnSecondary} onClick={() => navigate('/dashboard')}>
                dashboard
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
    height: '100vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg)',
    backgroundImage: 'radial-gradient(circle, #C8C4BB 0.8px, transparent 0.8px)',
    backgroundSize: '24px 24px',
  },
  header: {
    padding: '14px 24px',
    borderBottom: '1px solid var(--border)',
    background: 'rgba(248,246,241,0.88)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  logo: { display: 'flex', alignItems: 'baseline' },
  logoL: {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: 17,
    fontWeight: 400,
    color: 'var(--accent)',
  },
  logoR: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    fontWeight: 500,
    color: 'var(--muted)',
  },
  lessonBadge: {
    fontSize: 10,
    color: 'var(--muted)',
    fontFamily: 'var(--font-mono)',
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 5,
    padding: '3px 9px',
    maxWidth: 280,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    letterSpacing: '0.04em',
  },
  endBtn: {
    padding: '6px 14px',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--muted)',
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '0.06em',
    cursor: 'pointer',
    transition: 'border-color 0.15s, color 0.15s',
  },
  mainArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    overflow: 'hidden',
    gap: 0,
  },
  avatarCol: {
    width: 240,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '28px 0 12px 20px',
    borderRight: '1px solid var(--border)',
    // Hide on small screens via a media query isn't possible in inline styles,
    // but the layout will still work — avatar just stacks on mobile.
  },
  chatArea: { flex: 1, overflowY: 'auto', padding: '28px 16px 12px' },
  chatInner: { maxWidth: 560, margin: '0 auto' },
  bottom: {
    padding: '16px 20px 24px',
    borderTop: '1px solid var(--border)',
    background: 'rgba(248,246,241,0.88)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    maxWidth: 680,
  },
  langToggle: (isNative) => ({
    padding: '0 10px',
    height: 38,
    background: isNative ? 'var(--accent-dim)' : 'var(--surface-2)',
    border: `1px solid ${isNative ? 'rgba(15,82,160,0.35)' : 'var(--border)'}`,
    borderRadius: 8,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
    transition: 'background 0.15s, border-color 0.15s',
  }),
  toggleLang: (active) => ({
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    fontWeight: active ? 600 : 400,
    color: active ? 'var(--accent)' : 'var(--dim)',
    letterSpacing: '0.06em',
    transition: 'color 0.15s, font-weight 0.15s',
  }),
  toggleArrow: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    color: 'var(--dim)',
    opacity: 0.5,
  },
  textInput: {
    flex: 1,
    height: 38,
    padding: '0 14px',
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    color: 'var(--text)',
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  sendBtn: (active) => ({
    width: 38,
    height: 38,
    background: active ? 'var(--accent)' : 'var(--surface-2)',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 8,
    color: active ? '#fff' : 'var(--dim)',
    fontSize: 14,
    cursor: active ? 'pointer' : 'default',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'background 0.15s, border-color 0.15s, color 0.15s',
  }),
  statusRow: { display: 'flex', alignItems: 'center' },
  statusText: {
    fontSize: 10,
    color: 'var(--muted)',
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.08em',
  },
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(20,18,16,0.55)',
    backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 50, padding: 20,
  },
  modal: {
    padding: '32px 28px 28px',
    maxWidth: 460, width: '100%',
  },
  modalEyebrow: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9, letterSpacing: '0.20em', textTransform: 'uppercase',
    color: 'var(--accent)', opacity: 0.7, marginBottom: 10,
  },
  modalCefr: {
    fontFamily: 'var(--font-display)',
    fontSize: 72, fontWeight: 400,
    letterSpacing: '-0.04em',
    color: 'var(--accent)',
    lineHeight: 1, marginBottom: 4,
  },
  modalConf: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10, color: 'var(--muted)',
    marginBottom: 22, letterSpacing: '0.06em',
  },
  modalSection: { marginBottom: 16 },
  tagRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  tagGreen: {
    padding: '4px 10px', background: 'var(--sage-dim)',
    border: '1px solid rgba(55,107,82,0.2)', borderRadius: 20,
    fontSize: 10, color: 'var(--sage)', fontFamily: 'var(--font-mono)',
    letterSpacing: '0.04em',
  },
  tagBlue: {
    padding: '4px 10px', background: 'var(--accent-dim)',
    border: '1px solid rgba(15,82,160,0.18)', borderRadius: 20,
    fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--font-mono)',
    letterSpacing: '0.04em',
  },
  recommendation: {
    fontSize: 13, color: 'var(--text)',
    lineHeight: 1.7,
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
  },
  modalBtns: { display: 'flex', gap: 10, marginTop: 24 },
  btnPrimary: {
    flex: 1, padding: '12px',
    background: 'var(--accent)', border: 'none',
    borderRadius: 'var(--radius)',
    color: '#fff', fontFamily: 'var(--font-display)',
    fontSize: 18, fontWeight: 400, cursor: 'pointer',
    boxShadow: '0 3px 18px rgba(15,82,160,0.28)',
  },
  btnSecondary: {
    flex: 1, padding: '12px',
    background: 'transparent', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', color: 'var(--muted)',
    fontFamily: 'var(--font-mono)', fontSize: 10,
    letterSpacing: '0.06em', cursor: 'pointer',
  },
}
