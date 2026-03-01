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
      <div style={s.layout}>

        {/* Left column — brand + copy */}
        <div style={s.left}>
          <div className="reveal-0" style={s.wordmark}>
            <span style={s.wordmarkL}>Rosetta</span>
          </div>
          <h1 className="reveal-1" style={s.headline}>
            Your personal<br />
            <em style={s.headlineItal}>language<br />laboratory.</em>
          </h1>
          <p className="reveal-2" style={s.sub}>
            Conversational AI tutoring,<br />
            calibrated to your level<br />
            and adapted every session.
          </p>
          <div className="reveal-3" style={s.tagRow}>
            {['AI-adaptive', 'voice-first', 'CEFR-tracked'].map(t => (
              <span key={t} style={s.tag}>{t}</span>
            ))}
          </div>
        </div>

        {/* Right column — form */}
        <div className="reveal-2 card" style={s.card}>

          {/* Name */}
          <div style={s.section}>
            <div className="label-caps" style={{ marginBottom: 10 }}>your name</div>
            <input
              className="field"
              placeholder="e.g. Alex"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleStart()}
              style={{ fontFamily: 'var(--font-display)', fontSize: 18, padding: '11px 14px' }}
            />
          </div>

          {/* Target language */}
          <div style={s.section}>
            <div className="label-caps" style={{ marginBottom: 10 }}>language to learn</div>
            <div style={s.langGrid}>
              {LANGUAGES.map(lang => {
                const sel = targetLang === lang.code
                return (
                  <button key={lang.code} style={s.langCard(sel)} onClick={() => setTargetLang(lang.code)}>
                    <span style={s.langFlag}>{lang.flag}</span>
                    <span style={s.langNative}>{lang.native}</span>
                    <span style={s.langEn}>{lang.label}</span>
                    {sel && <div style={s.selDot} />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Native language */}
          <div style={s.section}>
            <div className="label-caps" style={{ marginBottom: 10 }}>you speak</div>
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
            <div className="label-caps" style={{ marginBottom: 10 }}>current level</div>
            <div style={s.cefrRow}>
              {CEFR.map(c => {
                const sel = cefrLevel === c
                return (
                  <div key={c} className="tooltip-wrap">
                    <span className="tooltip">{CEFR_DESC[c]}</span>
                    <button style={s.cefrBtn(sel)} onClick={() => setCefrLevel(c)}>
                      <span style={{ display: 'block', fontWeight: sel ? 500 : 300 }}>{c}</span>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Divider */}
          <div style={s.formRule} />

          {/* Submit */}
          <button style={s.submitBtn(!!canSubmit && !loading)} onClick={handleStart} disabled={!canSubmit || loading}>
            {loading
              ? <><span className="spinner" style={{ width: 13, height: 13, marginRight: 10 }} />setting up…</>
              : <><em style={{ fontStyle: 'italic', fontWeight: 400 }}>begin</em>&ensp;↗</>
            }
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
    padding: '48px 24px',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 56,
    maxWidth: 860,
    width: '100%',
    alignItems: 'center',
    '@media (max-width: 640px)': { gridTemplateColumns: '1fr' },
  },
  left: {
    paddingRight: 8,
  },
  wordmark: {
    display: 'flex',
    alignItems: 'baseline',
    marginBottom: 36,
  },
  wordmarkL: {
    fontFamily: 'var(--font-mono)',
    textTransform: 'uppercase',
    letterSpacing: '0.22em',
    fontSize: 16,
    fontWeight: 500,
    color: 'var(--accent)',
  },
  wordmarkR: {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--muted)',
  },
  headline: {
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(36px, 5.5vw, 58px)',
    fontWeight: 400,
    lineHeight: 1.08,
    letterSpacing: '-0.02em',
    color: 'var(--text)',
    marginBottom: 20,
  },
  headlineItal: {
    fontStyle: 'italic',
    color: 'var(--accent)',
  },
  sub: {
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    color: 'var(--muted)',
    lineHeight: 1.9,
    marginBottom: 28,
    fontWeight: 300,
    letterSpacing: '0.02em',
  },
  tagRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    padding: '4px 10px',
    background: 'var(--accent-dim)',
    border: '1px solid rgba(15,82,160,0.18)',
    borderRadius: 20,
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--accent)',
    letterSpacing: '0.06em',
  },
  card: {
    padding: '30px 28px 26px',
  },
  section: { marginBottom: 22 },
  langGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 6,
  },
  langCard: sel => ({
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    padding: '11px 5px 9px',
    borderRadius: 'var(--radius)',
    border: `1.5px solid ${sel ? 'var(--accent)' : 'var(--border)'}`,
    background: sel ? 'var(--accent-dim)' : 'var(--surface-2)',
    cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
    outline: 'none',
    boxShadow: sel ? '0 0 0 2px var(--accent-dim)' : 'none',
  }),
  langFlag: { fontSize: 18, lineHeight: 1 },
  langNative: {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: 12,
    color: 'var(--text)',
  },
  langEn: {
    fontSize: 11,
    color: 'var(--muted)',
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.04em',
  },
  selDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: 'var(--accent)',
  },
  arrow: {
    position: 'absolute', right: 13, top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--muted)', fontSize: 11, pointerEvents: 'none',
    fontFamily: 'var(--font-mono)',
  },
  cefrRow: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 5 },
  cefrBtn: sel => ({
    width: '100%',
    height: 54,
    padding: '9px 3px 7px',
    borderRadius: 6,
    border: `1.5px solid ${sel ? 'var(--accent)' : 'var(--border)'}`,
    background: sel ? 'var(--accent-dim)' : 'var(--surface)',
    color: sel ? 'var(--accent)' : 'var(--muted)',
    cursor: 'pointer',
    textAlign: 'center',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    transition: 'all 0.15s',
    outline: 'none',
  }),
  cefrSub: {
    display: 'block',
    fontSize: 7,
    marginTop: 3,
    opacity: 0.6,
    letterSpacing: '0.04em',
    fontFamily: 'var(--font-mono)',
  },
  formRule: {
    height: 1,
    background: 'var(--border-subtle)',
    marginBottom: 20,
  },
  submitBtn: active => ({
    width: '100%',
    padding: '14px',
    border: 'none',
    borderRadius: 'var(--radius)',
    background: active ? 'var(--accent)' : 'var(--surface-2)',
    color: active ? '#fff' : 'var(--dim)',
    fontFamily: 'var(--font-display)',
    fontSize: 19,
    fontWeight: 400,
    letterSpacing: '-0.01em',
    cursor: active ? 'pointer' : 'not-allowed',
    transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
    boxShadow: active ? '0 3px 20px rgba(15,82,160,0.28)' : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),
  error: {
    marginTop: 12,
    fontSize: 12,
    color: 'var(--red)',
    fontFamily: 'var(--font-mono)',
    textAlign: 'center',
    letterSpacing: '0.03em',
  },
}
