import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserProfile, getSessionHistory } from '../services/api.js'
import Nav from '../components/Nav.jsx'

const LANG_NAMES = {
  spa: 'Spanish', fra: 'French', deu: 'German',
  cmn: 'Mandarin', jpn: 'Japanese', por: 'Portuguese', hin: 'Hindi', eng: 'English',
}

const LANG_FLAGS = {
  spa: '🇪🇸', fra: '🇫🇷', deu: '🇩🇪',
  cmn: '🇨🇳', jpn: '🇯🇵', por: '🇧🇷', hin: '🇮🇳', eng: '🇬🇧',
}

const LANG_NATIVE = {
  spa: 'Español', fra: 'Français', deu: 'Deutsch',
  cmn: '中文', jpn: '日本語', por: 'Português', hin: 'हिन्दी', eng: 'English',
}

const CEFR_LABELS = {
  A1: 'Beginner', A2: 'Elementary', B1: 'Intermediate',
  B2: 'Upper-intermediate', C1: 'Advanced', C2: 'Mastery',
}

const CEFR_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export default function Profile() {
  const navigate = useNavigate()
  const userId = localStorage.getItem('user_id')

  const [profile, setProfile] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { navigate('/onboarding'); return }
    async function load() {
      try {
        const [prof, hist] = await Promise.all([getUserProfile(userId), getSessionHistory(userId)])
        setProfile(prof)
        setHistory(hist)
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [userId, navigate])

  if (loading) {
    return (
      <div className="grid-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="spinner" style={{ width: 24, height: 24 }} />
      </div>
    )
  }

  if (!profile) return null

  const cefrIndex = CEFR_ORDER.indexOf(profile.current_cefr_level)
  const lastSession = history.length > 0 ? history[history.length - 1] : null
  const firstSession = history.length > 0 ? history[0] : null

  return (
    <div className="grid-bg" style={s.page}>
      <div style={s.inner}>

        <div className="reveal-0"><Nav /></div>

        {/* Profile hero */}
        <div className="reveal-1" style={s.hero}>
          {/* Avatar */}
          <div style={s.avatar}>
            <span style={s.avatarInitial}>{profile.name[0].toUpperCase()}</span>
          </div>
          <div style={s.heroText}>
            <h1 style={s.name}>{profile.name}</h1>
            <div style={s.since}>
              {firstSession
                ? `Learning since ${new Date(firstSession.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
                : 'No sessions yet'}
            </div>
          </div>
        </div>

        <div className="reveal-1" style={s.rule} />

        {/* Stats row */}
        <div className="reveal-2" style={s.statsRow}>
          <div className="card" style={s.statCard}>
            <div className="label-caps" style={{ marginBottom: 10 }}>Current level</div>
            <div style={s.statBig}>{profile.current_cefr_level}</div>
            <div style={s.statSub}>{CEFR_LABELS[profile.current_cefr_level]}</div>
          </div>
          <div className="card" style={s.statCard}>
            <div className="label-caps" style={{ marginBottom: 10 }}>Sessions</div>
            <div style={s.statBig}>{history.length}</div>
            <div style={s.statSub}>completed</div>
          </div>
          <div className="card" style={s.statCard}>
            <div className="label-caps" style={{ marginBottom: 10 }}>Last session</div>
            <div style={{ ...s.statBig, fontSize: 18 }}>
              {lastSession
                ? new Date(lastSession.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : '—'}
            </div>
            <div style={s.statSub}>{lastSession ? lastSession.lesson_title || 'Untitled' : 'none yet'}</div>
          </div>
        </div>

        {/* Language pair */}
        <div className="reveal-3 card" style={s.card}>
          <div className="label-caps" style={{ marginBottom: 18 }}>Language pair</div>
          <div style={s.langPair}>
            <div style={s.langBlock}>
              <span style={s.langFlag}>{LANG_FLAGS[profile.native_language] ?? '🌐'}</span>
              <div>
                <div style={s.langName}>{LANG_NAMES[profile.native_language] ?? profile.native_language}</div>
                <div style={s.langNative}>{LANG_NATIVE[profile.native_language] ?? ''}</div>
                <div className="label-caps" style={{ marginTop: 4, fontSize: 9 }}>Native</div>
              </div>
            </div>
            <div style={s.langArrow}>→</div>
            <div style={s.langBlock}>
              <span style={s.langFlag}>{LANG_FLAGS[profile.target_language] ?? '🌐'}</span>
              <div>
                <div style={s.langName}>{LANG_NAMES[profile.target_language] ?? profile.target_language}</div>
                <div style={s.langNative}>{LANG_NATIVE[profile.target_language] ?? ''}</div>
                <div className="label-caps" style={{ marginTop: 4, fontSize: 9 }}>Learning</div>
              </div>
            </div>
          </div>
        </div>

        {/* CEFR progress bar */}
        <div className="reveal-3 card" style={s.card}>
          <div className="label-caps" style={{ marginBottom: 18 }}>CEFR progression</div>
          <div style={s.cefrTrack}>
            {CEFR_ORDER.map((c, i) => (
              <div key={c} style={s.cefrStep}>
                <div style={s.cefrDot(i <= cefrIndex, i === cefrIndex)} />
                {i < CEFR_ORDER.length - 1 && (
                  <div style={s.cefrLine(i < cefrIndex)} />
                )}
                <div style={s.cefrLabel(i === cefrIndex)}>{c}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Strengths + weaknesses */}
        {(profile.strengths?.length > 0 || profile.weaknesses?.length > 0) && (
          <div className="reveal-4" style={s.twoCol}>
            {profile.strengths?.length > 0 && (
              <div className="card" style={s.card}>
                <div className="label-caps" style={{ marginBottom: 14 }}>Strengths</div>
                <div style={s.tagCloud}>
                  {profile.strengths.map((t, i) => (
                    <span key={i} style={s.tagGreen}>{t}</span>
                  ))}
                </div>
              </div>
            )}
            {profile.weaknesses?.length > 0 && (
              <div className="card" style={s.card}>
                <div className="label-caps" style={{ marginBottom: 14 }}>To improve</div>
                <div style={s.tagCloud}>
                  {profile.weaknesses.map((t, i) => (
                    <span key={i} style={s.tagOrange}>{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reset */}
        <div className="reveal-5" style={s.resetRow}>
          <button style={s.resetBtn} onClick={() => {
            localStorage.clear()
            navigate('/onboarding')
          }}>
            Start fresh with a new profile
          </button>
        </div>

      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', padding: '0 16px 48px' },
  inner: { maxWidth: 740, margin: '0 auto' },

  hero: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    padding: '20px 0 28px',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'var(--accent-dim)',
    border: '2px solid var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitial: {
    fontFamily: 'Fraunces, Georgia, serif',
    fontSize: 28,
    fontWeight: 600,
    color: 'var(--accent)',
  },
  heroText: {},
  name: {
    fontFamily: 'Fraunces, Georgia, serif',
    fontSize: 'clamp(26px, 5vw, 38px)',
    fontWeight: 600,
    letterSpacing: '-0.025em',
    color: 'var(--text)',
    lineHeight: 1.1,
    marginBottom: 6,
  },
  since: {
    fontFamily: 'Overpass Mono, monospace',
    fontSize: 11,
    color: 'var(--muted)',
  },

  rule: {
    height: 1,
    background: 'linear-gradient(90deg, var(--border) 0%, transparent 80%)',
    marginBottom: 24,
  },

  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
    marginBottom: 14,
  },
  statCard: { padding: '18px 20px 16px', textAlign: 'center' },
  statBig: {
    fontFamily: 'Fraunces, Georgia, serif',
    fontSize: 36,
    fontWeight: 700,
    letterSpacing: '-0.03em',
    color: 'var(--accent)',
    lineHeight: 1,
    marginBottom: 4,
  },
  statSub: {
    fontFamily: 'Overpass Mono, monospace',
    fontSize: 10,
    color: 'var(--dim)',
    letterSpacing: '0.05em',
  },

  card: { padding: '20px 22px 18px', marginBottom: 14 },

  langPair: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
  },
  langBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  langFlag: { fontSize: 32, lineHeight: 1 },
  langName: {
    fontFamily: 'Fraunces, Georgia, serif',
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--text)',
    letterSpacing: '-0.02em',
  },
  langNative: {
    fontFamily: 'Fraunces, Georgia, serif',
    fontStyle: 'italic',
    fontSize: 14,
    fontWeight: 300,
    color: 'var(--muted)',
    marginTop: 1,
  },
  langArrow: {
    fontFamily: 'Overpass Mono, monospace',
    fontSize: 18,
    color: 'var(--dim)',
    flexShrink: 0,
  },

  cefrTrack: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 0,
  },
  cefrStep: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    flexDirection: 'column',
    position: 'relative',
  },
  cefrDot: (filled, current) => ({
    width: current ? 14 : 10,
    height: current ? 14 : 10,
    borderRadius: '50%',
    background: filled ? 'var(--accent)' : 'var(--surface-3)',
    border: `2px solid ${filled ? 'var(--accent)' : 'var(--border)'}`,
    boxShadow: current ? '0 0 10px rgba(212,112,42,0.5)' : 'none',
    flexShrink: 0,
    zIndex: 1,
    marginBottom: 8,
    transition: 'all 0.2s',
  }),
  cefrLine: filled => ({
    position: 'absolute',
    top: 6,
    left: '50%',
    width: '100%',
    height: 2,
    background: filled ? 'var(--accent)' : 'var(--border)',
    zIndex: 0,
  }),
  cefrLabel: current => ({
    fontFamily: 'Overpass Mono, monospace',
    fontSize: current ? 12 : 10,
    fontWeight: current ? 600 : 400,
    color: current ? 'var(--accent)' : 'var(--dim)',
  }),

  twoCol: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 12,
    marginBottom: 14,
  },
  tagCloud: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  tagGreen: {
    padding: '4px 10px',
    background: 'var(--sage-dim)',
    border: '1px solid rgba(78,142,110,0.28)',
    borderRadius: 6,
    fontSize: 11,
    color: 'var(--sage)',
    fontFamily: 'Overpass Mono, monospace',
  },
  tagOrange: {
    padding: '4px 10px',
    background: 'var(--accent-dim)',
    border: '1px solid rgba(212,112,42,0.28)',
    borderRadius: 6,
    fontSize: 11,
    color: 'var(--accent-bright)',
    fontFamily: 'Overpass Mono, monospace',
  },

  resetRow: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: 32,
  },
  resetBtn: {
    background: 'none',
    border: 'none',
    fontFamily: 'Overpass Mono, monospace',
    fontSize: 11,
    color: 'var(--dim)',
    cursor: 'pointer',
    textDecoration: 'underline',
    textUnderlineOffset: 3,
    transition: 'color 0.15s',
  },
}
