import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createUserProfile } from '../services/api.js'

const LANGUAGES = [
  { code: 'spa', label: 'Spanish', flag: '🇪🇸' },
  { code: 'fra', label: 'French', flag: '🇫🇷' },
  { code: 'deu', label: 'German', flag: '🇩🇪' },
  { code: 'cmn', label: 'Mandarin', flag: '🇨🇳' },
  { code: 'jpn', label: 'Japanese', flag: '🇯🇵' },
  { code: 'por', label: 'Portuguese', flag: '🇧🇷' },
]

const CEFR_OPTIONS = [
  { value: 'A1', label: "I'm a complete beginner" },
  { value: 'A2', label: 'I know a few basics' },
  { value: 'B1', label: "I'm intermediate" },
  { value: 'B2', label: "I'm upper-intermediate" },
  { value: 'C1', label: "I'm advanced" },
  { value: 'C2', label: 'I speak it almost fluently' },
]

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)',
  },
  card: {
    background: '#12121f',
    border: '1px solid #1e293b',
    borderRadius: 20,
    padding: 40,
    maxWidth: 540,
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: 8,
  },
  subtitle: { color: '#64748b', fontSize: 15, marginBottom: 32 },
  label: { color: '#94a3b8', fontSize: 13, marginBottom: 10, display: 'block' },
  section: { marginBottom: 28 },
  langGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
  },
  langCard: (selected) => ({
    padding: '14px 10px',
    borderRadius: 12,
    border: `2px solid ${selected ? '#6366f1' : '#1e293b'}`,
    background: selected ? 'rgba(99,102,241,0.15)' : '#0f0f1a',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.15s',
  }),
  langFlag: { fontSize: 24 },
  langLabel: { fontSize: 12, color: '#cbd5e1', marginTop: 4 },
  input: {
    width: '100%',
    padding: '10px 14px',
    background: '#0f0f1a',
    border: '1px solid #1e293b',
    borderRadius: 10,
    color: '#e2e8f0',
    fontSize: 14,
    outline: 'none',
  },
  select: {
    width: '100%',
    padding: '10px 14px',
    background: '#0f0f1a',
    border: '1px solid #1e293b',
    borderRadius: 10,
    color: '#e2e8f0',
    fontSize: 14,
    outline: 'none',
  },
  btn: (disabled) => ({
    width: '100%',
    padding: '14px',
    background: disabled
      ? '#334155'
      : 'linear-gradient(135deg, #6366f1, #4f46e5)',
    border: 'none',
    borderRadius: 12,
    color: disabled ? '#64748b' : '#fff',
    fontSize: 16,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
  }),
  error: { color: '#f87171', fontSize: 13, marginTop: 8 },
}

export default function Onboarding() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [targetLang, setTargetLang] = useState('')
  const [nativeLang, setNativeLang] = useState('eng')
  const [cefrLevel, setCefrLevel] = useState('A1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = name.trim() && targetLang

  async function handleStart() {
    if (!canSubmit) return
    setLoading(true)
    setError('')
    try {
      const profile = await createUserProfile({
        name: name.trim(),
        target_language: targetLang,
        native_language: nativeLang,
        current_cefr_level: cefrLevel,
      })
      localStorage.setItem('user_id', profile.user_id)
      localStorage.setItem('target_language', targetLang)
      navigate('/session')
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create profile. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.title}>LinguaAI</div>
        <div style={s.subtitle}>AI-powered language tutoring, adapted to you</div>

        {/* Name */}
        <div style={s.section}>
          <label style={s.label}>Your name</label>
          <input
            style={s.input}
            placeholder="e.g. Alex"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Target language */}
        <div style={s.section}>
          <label style={s.label}>Language you want to learn</label>
          <div style={s.langGrid}>
            {LANGUAGES.map((lang) => (
              <div
                key={lang.code}
                style={s.langCard(targetLang === lang.code)}
                onClick={() => setTargetLang(lang.code)}
              >
                <div style={s.langFlag}>{lang.flag}</div>
                <div style={s.langLabel}>{lang.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Native language */}
        <div style={s.section}>
          <label style={s.label}>Your native language</label>
          <input
            style={s.input}
            placeholder="e.g. English (type language code: eng, esp...)"
            value={nativeLang}
            onChange={(e) => setNativeLang(e.target.value)}
          />
        </div>

        {/* CEFR self-estimate */}
        <div style={s.section}>
          <label style={s.label}>Current level estimate</label>
          <select
            style={s.select}
            value={cefrLevel}
            onChange={(e) => setCefrLevel(e.target.value)}
          >
            {CEFR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.value} — {o.label}
              </option>
            ))}
          </select>
        </div>

        <button style={s.btn(!canSubmit || loading)} onClick={handleStart} disabled={!canSubmit || loading}>
          {loading ? 'Setting up your tutor...' : 'Start Learning →'}
        </button>

        {error && <div style={s.error}>{error}</div>}
      </div>
    </div>
  )
}
