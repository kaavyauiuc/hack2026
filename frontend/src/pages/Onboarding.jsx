import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createUserProfile } from '../services/api.js'

const LANGUAGES = [
  { code: 'spa', label: 'Spanish',    native: 'Español',   flag: '🇪🇸' },
  { code: 'fra', label: 'French',     native: 'Français',  flag: '🇫🇷' },
  { code: 'deu', label: 'German',     native: 'Deutsch',   flag: '🇩🇪' },
  { code: 'cmn', label: 'Mandarin',   native: '中文',       flag: '🇨🇳' },
  { code: 'jpn', label: 'Japanese',   native: '日本語',     flag: '🇯🇵' },
  { code: 'por', label: 'Portuguese', native: 'Português', flag: '🇧🇷' },
  { code: 'hin', label: 'Hindi',      native: 'हिन्दी',    flag: '🇮🇳' },
]

const NATIVE_LANGUAGES = [
  { code: 'eng', label: 'English'    },
  { code: 'spa', label: 'Spanish'    },
  { code: 'fra', label: 'French'     },
  { code: 'deu', label: 'German'     },
  { code: 'cmn', label: 'Mandarin'   },
  { code: 'jpn', label: 'Japanese'   },
  { code: 'por', label: 'Portuguese' },
  { code: 'hin', label: 'Hindi'      },
]

const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const CEFR_DESC = {
  A1: 'Beginner', A2: 'Elementary', B1: 'Intermediate',
  B2: 'Upper-int.', C1: 'Advanced', C2: 'Mastery',
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
      setError(e.response?.data?.detail || 'Could not create profile — is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid-bg" style={s.root}>
      <div style={s.wrap}>

        {/* Brand mark */}
        <div className="reveal-0" style={s.brandRow}>
          <span style={s.dot} />
          <span style={s.brandName}>LinguaAI</span>
        </div>

        {/* Headline */}
        <h1 className="reveal-1" style={s.headline}>
          Your personal<br />
          <em style={s.headlineAccent}>language atelier.</em>
        </h1>

        <p className="reveal-2" style={s.sub}>
          Conversational AI tutoring, calibrated to your level<br />and adapted after every session.
        </p>

        {/* Divider */}
        <div className="reveal-2" style={s.rule} />

        {/* Form */}
        <div className="reveal-3 card" style={s.card}>

          {/* Name */}
          <div style={s.section}>
            <div className="label-caps" style={{ marginBottom: 10 }}>Your name</div>
            <input
              className="field"
              placeholder="e.g. Alex"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleStart()}
            />
          </div>

          {/* Target language */}
          <div style={s.section}>
            <div className="label-caps" style={{ marginBottom: 10 }}>Language to learn</div>
            <div style={s.langGrid}>
              {LANGUAGES.map(lang => {
                const sel = targetLang === lang.code
                return (
                  <button key={lang.code} style={s.langCard(sel)} onClick={() => setTargetLang(lang.code)}>
                    <span style={s.langFlag}>{lang.flag}</span>
                    <span style={s.langNative}>{lang.native}</span>
                    <span style={s.langEn}>{lang.label}</span>
                    {sel && <span style={s.tick}>✓</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Native language */}
          <div style={s.section}>
            <div className="label-caps" style={{ marginBottom: 10 }}>Native language</div>
            <div style={{ position: 'relative' }}>
              <select
                className="field"
                value={nativeLang}
                onChange={e => setNativeLang(e.target.value)}
                style={{ paddingRight: 36, cursor: 'pointer' }}
              >
                {NATIVE_LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
              <span style={s.arrow}>▾</span>
            </div>
          </div>

          {/* CEFR level */}
          <div style={s.section}>
            <div className="label-caps" style={{ marginBottom: 10 }}>Current level</div>
            <div style={s.cefrRow}>
              {CEFR.map(c => {
                const sel = cefrLevel === c
                return (
                  <button key={c} style={s.cefrBtn(sel)} onClick={() => setCefrLevel(c)} title={CEFR_DESC[c]}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: sel ? 600 : 400 }}>{c}</span>
                    <span style={s.cefrSub}>{CEFR_DESC[c]}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Submit */}
          <button style={s.submitBtn(!!canSubmit && !loading)} onClick={handleStart} disabled={!canSubmit || loading}>
            {loading
              ? <><span className="spinner" style={{ width: 14, height: 14, marginRight: 10 }} />Setting up…</>
              : 'Begin →'}
          </button>

          {error && <div style={s.error}>{error}</div>}
        </div>

      </div>
    </div>
  )
}

const s = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 20px',
  },
  wrap: { maxWidth: 520, width: '100%' },
  brandRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 },
  dot: {
    width: 8, height: 8, borderRadius: '50%',
    background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)',
  },
  brandName: {
    fontFamily: 'Fraunces, Georgia, serif',
    fontStyle: 'italic',
    fontSize: 14,
    fontWeight: 400,
    color: 'var(--muted)',
    letterSpacing: '0.03em',
  },
  headline: {
    fontFamily: 'Fraunces, Georgia, serif',
    fontSize: 'clamp(34px, 6.5vw, 50px)',
    fontWeight: 600,
    lineHeight: 1.1,
    letterSpacing: '-0.025em',
    color: 'var(--text)',
    marginBottom: 14,
  },
  headlineAccent: {
    fontStyle: 'italic',
    fontWeight: 300,
    color: 'var(--accent)',
  },
  sub: {
    fontFamily: 'Overpass Mono, monospace',
    fontSize: 12,
    color: 'var(--muted)',
    lineHeight: 1.8,
    marginBottom: 28,
  },
  rule: {
    height: 1,
    background: 'linear-gradient(90deg, var(--border) 0%, transparent 80%)',
    marginBottom: 28,
  },
  card: { padding: '28px 28px 24px' },
  section: { marginBottom: 24 },
  langGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8,
  },
  langCard: sel => ({
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '13px 6px 11px',
    borderRadius: 'var(--radius)',
    border: `1.5px solid ${sel ? 'var(--accent)' : 'var(--border)'}`,
    background: sel ? 'var(--accent-dim)' : 'var(--surface-2)',
    cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s, transform 0.12s',
    transform: sel ? 'scale(1.03)' : 'scale(1)',
    outline: 'none',
  }),
  langFlag: { fontSize: 20, lineHeight: 1 },
  langNative: {
    fontFamily: 'Fraunces, Georgia, serif',
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text)',
    letterSpacing: '-0.01em',
  },
  langEn: { fontSize: 10, color: 'var(--muted)', fontFamily: 'Overpass Mono, monospace' },
  tick: { position: 'absolute', top: 6, right: 8, fontSize: 9, color: 'var(--accent)', fontWeight: 700 },
  arrow: {
    position: 'absolute', right: 14, top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--muted)', fontSize: 12, pointerEvents: 'none',
  },
  cefrRow: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 },
  cefrBtn: sel => ({
    padding: '10px 4px 8px',
    borderRadius: 8,
    border: `1.5px solid ${sel ? 'var(--accent)' : 'var(--border)'}`,
    background: sel ? 'var(--accent-dim)' : 'var(--surface-2)',
    color: sel ? 'var(--accent-bright)' : 'var(--muted)',
    cursor: 'pointer',
    textAlign: 'center',
    fontFamily: 'Overpass Mono, monospace',
    transition: 'all 0.15s',
    outline: 'none',
  }),
  cefrSub: {
    display: 'block', fontSize: 8, marginTop: 2,
    opacity: 0.6, letterSpacing: '0.04em',
    fontFamily: 'Overpass Mono, monospace',
  },
  submitBtn: active => ({
    width: '100%',
    padding: '14px',
    marginTop: 4,
    border: 'none',
    borderRadius: 'var(--radius)',
    background: active ? 'var(--accent)' : 'var(--surface-3)',
    color: active ? '#fff' : 'var(--dim)',
    fontFamily: 'Fraunces, Georgia, serif',
    fontStyle: 'italic',
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    cursor: active ? 'pointer' : 'not-allowed',
    transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
    boxShadow: active ? '0 4px 28px rgba(212,112,42,0.32)' : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),
  error: {
    marginTop: 12,
    fontSize: 11,
    color: 'var(--red)',
    fontFamily: 'Overpass Mono, monospace',
    textAlign: 'center',
  },
}
