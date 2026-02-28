import { useState, useRef, useCallback } from 'react'

/**
 * AudioRecorder hook — click to start, click to stop (toggle).
 *
 * stopRecording reads the MediaRecorder ref directly (not isRecording state)
 * so it works even when called synchronously after startRecording before
 * the state update has flushed.
 */
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
        stream.getTracks().forEach((t) => t.stop())
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

  // Uses the ref directly — no dependency on isRecording state — so it's
  // always safe to call immediately after startRecording.
  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
      setIsRecording(false)
    }
  }, [])

  return { isRecording, startRecording, stopRecording }
}

const styles = {
  button: (isRecording, isDisabled) => ({
    width: 80,
    height: 80,
    borderRadius: '50%',
    border: 'none',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    fontSize: 32,
    background: isRecording
      ? 'linear-gradient(135deg, #ef4444, #dc2626)'
      : isDisabled
        ? '#1e293b'
        : 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: '#fff',
    opacity: isDisabled ? 0.45 : 1,
    boxShadow: isRecording
      ? '0 0 0 8px rgba(239,68,68,0.3), 0 4px 20px rgba(239,68,68,0.5)'
      : isDisabled
        ? 'none'
        : '0 4px 20px rgba(99,102,241,0.4)',
    transform: isRecording ? 'scale(1.1)' : 'scale(1)',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),
  label: {
    marginTop: 8,
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
}

/**
 * MicButton — click once to start recording, click again to stop and send.
 * The stop action is never disabled so the user can always end a recording.
 */
export default function MicButton({ isRecording, onStart, onStop, disabled }) {
  // Only block starting — never block stopping
  const blockStart = disabled && !isRecording

  return (
    <div style={styles.wrapper}>
      <button
        style={styles.button(isRecording, blockStart)}
        onClick={isRecording ? onStop : onStart}
        disabled={blockStart}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {isRecording ? '⏹' : '🎤'}
      </button>
      <span style={styles.label}>
        {isRecording
          ? 'Recording… tap to send'
          : disabled
            ? 'Please wait…'
            : 'Tap to speak'}
      </span>
    </div>
  )
}
