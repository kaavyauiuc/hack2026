import axios from 'axios'

const api = axios.create({
  baseURL: '',  // Uses Vite proxy; requests go to /user, /session, /speech
  timeout: 60000,
})

// ─────────────────────────────────────────────
// User
// ─────────────────────────────────────────────

export const createUserProfile = (data) =>
  api.post('/user/profile', data).then((r) => r.data)

export const getUserProfile = (userId) =>
  api.get(`/user/profile/${userId}`).then((r) => r.data)

// ─────────────────────────────────────────────
// Session
// ─────────────────────────────────────────────

export const startSession = (userId) =>
  api.post('/session/start', { user_id: userId }).then((r) => r.data)

export const endSession = (sessionId, userId) =>
  api.post('/session/end', { session_id: sessionId, user_id: userId }).then((r) => r.data)

export const getSessionHistory = (userId) =>
  api.get(`/session/history/${userId}`).then((r) => r.data)

/**
 * Sends a user message and returns a ReadableStream of SSE chunks.
 * Caller should iterate with a reader.
 */
export async function sendMessage(sessionId, userId, text) {
  const response = await fetch('/session/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, user_id: userId, text }),
  })
  if (!response.ok) throw new Error(`sendMessage failed: ${response.status}`)
  return response.body.getReader()
}

// ─────────────────────────────────────────────
// Speech
// ─────────────────────────────────────────────

export async function transcribeAudio(audioBlob, language) {
  const formData = new FormData()
  formData.append('audio', audioBlob, 'recording.webm')
  formData.append('language', language)
  const res = await api.post('/speech/stt', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.transcript
}

export async function synthesizeSpeech(text, language) {
  const response = await fetch('/speech/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language }),
  })
  if (!response.ok) throw new Error(`TTS failed: ${response.status}`)
  const blob = await response.blob()
  return URL.createObjectURL(blob)
}
