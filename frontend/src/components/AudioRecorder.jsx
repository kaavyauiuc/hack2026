import { useState, useRef, useCallback } from 'react'

export function useAudioRecorder(onBlob) {
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        stream.getTracks().forEach(t => t.stop())
        onBlob(blob)
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
    } catch (err) {
      console.error('Microphone access denied:', err)
      alert('Microphone access is required. Please allow mic access and try again.')
    }
  }, [onBlob])

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
      setIsRecording(false)
    }
  }, [])

  return { isRecording, startRecording, stopRecording }
}

export default function MicButton({ isRecording, onStart, onStop, disabled }) {
  const blockStart = disabled && !isRecording

  return (
    <div style={s.wrapper}>
      {/* Pulse rings when recording */}
      {isRecording && (
        <>
          <span style={{ ...s.ring, animationDelay: '0s'   }} />
          <span style={{ ...s.ring, animationDelay: '0.5s' }} />
        </>
      )}

      <button
        style={s.btn(isRecording, blockStart)}
        onClick={isRecording ? onStop : onStart}
        disabled={blockStart}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {isRecording ? (
          /* Stop square */
          <span style={s.stopIcon} />
        ) : (
          /* Mic icon */
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        )}
      </button>
    </div>
  )
}

const BTN_SIZE = 72

const s = {
  wrapper: {
    position: 'relative',
    width: BTN_SIZE,
    height: BTN_SIZE,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    inset: 0,
    borderRadius: '50%',
    border: '2px solid var(--red)',
    animation: 'pulseRing 1.4s ease-out infinite',
    pointerEvents: 'none',
  },
  btn: (isRecording, isDisabled) => ({
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: '50%',
    border: 'none',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    background: isRecording
      ? 'var(--red)'
      : isDisabled
        ? 'var(--surface-2)'
        : 'var(--accent)',
    color: isDisabled && !isRecording ? 'var(--dim)' : '#fff',
    opacity: isDisabled && !isRecording ? 0.5 : 1,
    boxShadow: isRecording
      ? '0 0 0 6px var(--red-glow), 0 4px 24px rgba(196,64,64,0.4)'
      : isDisabled
        ? 'none'
        : '0 4px 24px rgba(212,112,42,0.35)',
    transform: isRecording ? 'scale(1.08)' : 'scale(1)',
    transition: 'all 0.18s cubic-bezier(0.22,1,0.36,1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 1,
  }),
  stopIcon: {
    width: 20,
    height: 20,
    background: '#fff',
    borderRadius: 3,
  },
}
