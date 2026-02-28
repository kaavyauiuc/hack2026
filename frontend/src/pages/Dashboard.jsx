import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserProfile, getSessionHistory } from '../services/api.js'
import ProgressChart from '../components/ProgressChart.jsx'

const LANG_NAMES = {
  spa: 'Spanish', fra: 'French', deu: 'German',
  cmn: 'Mandarin', jpn: 'Japanese', por: 'Portuguese', eng: 'English',
}

const CEFR_LABELS = {
  A1: 'Beginner', A2: 'Elementary', B1: 'Intermediate',
  B2: 'Upper-intermediate', C1: 'Advanced', C2: 'Mastery',
}

export default function Dashboard() {
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

  const reversedHistory = [...history].reverse()

  return (
    <div className="grid-bg" style={s.page}>
      <div style={s.inner}>

        {/* Top nav */}
        <header className="reveal-0" style={s.nav}>
          <span style={s.navBrand}>LinguaAI</span>
          <button style={s.newSessionBtn} onClick={() => navigate('/session')}>
            New session →
          </button>
        </header>

        {profile && (
          <>
            {/* Hero */}
            <div className="reveal-1" style={s.hero}>
              <div style={s.heroLeft}>
                <div style={s.greeting}>
                  <em style={{ fontStyle: 'italic', fontWeight: 300 }}>Ciao,</em>{' '}
                  {profile.name}
                </div>
                <div style={s.langs}>
                  {LANG_NAMES[profile.native_language] || profile.native_language}
                  <span style={s.arrowSep}>→</span>
                  {LANG_NAMES[profile.target_language] || profile.target_language}
                </div>
                <div style={s.cefrLabel}>{CEFR_LABELS[profile.current_cefr_level] || ''}</div>
              </div>
              <div style={s.heroRight}>
                <div style={s.cefrDisplay}>{profile.current_cefr_level}</div>
                <div style={s.sessionCount}>{history.length} session{history.length !== 1 ? 's' : ''}</div>
              </div>
            </div>

            {/* Divider */}
            <div className="reveal-1" style={s.rule} />
          </>
        )}

        {/* CEFR chart */}
        <div className="reveal-2 card" style={s.card}>
          <div className="label-caps" style={{ marginBottom: 18 }}>Progress</div>
          <ProgressChart history={history} />
        </div>

        {/* Strengths / Weaknesses */}
        {profile && (profile.strengths?.length > 0 || profile.weaknesses?.length > 0) && (
          <div className="reveal-3" style={s.twoCol}>
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

        {/* Session history */}
        <div className="reveal-4 card" style={{ ...s.card, marginBottom: 48 }}>
          <div className="label-caps" style={{ marginBottom: 18 }}>
            Session history{history.length > 0 ? ` — ${history.length}` : ''}
          </div>

          {history.length === 0 ? (
            <div style={s.empty}>
              No sessions yet.{' '}
              <button onClick={() => navigate('/session')} style={s.emptyLink}>
                Start your first →
              </button>
            </div>
          ) : (
            <div>
              {/* Table header */}
              <div style={s.tableHeader}>
                <span style={{ flex: 1 }}>Lesson</span>
                <span style={{ width: 140 }}>Date</span>
                <span style={{ width: 60, textAlign: 'right' }}>Level</span>
              </div>
              {reversedHistory.map((session, i) => (
                <div key={i} style={s.tableRow(i === reversedHistory.length - 1)}>
                  <span style={s.rowTitle}>
                    {session.lesson_title || `Session ${history.length - i}`}
                  </span>
                  <span style={s.rowDate}>
                    {new Date(session.date).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </span>
                  <span style={s.rowCefr}>{session.cefr_estimate}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', padding: '0 16px' },
  inner: { maxWidth: 740, margin: '0 auto' },
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px 0 20px',
    marginBottom: 8,
  },
  navBrand: {
    fontFamily: 'Fraunces, Georgia, serif',
    fontStyle: 'italic',
    fontSize: 16,
    fontWeight: 500,
    color: 'var(--muted)',
  },
  newSessionBtn: {
    padding: '9px 18px',
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 'var(--radius)',
    color: '#fff',
    fontFamily: 'Fraunces, Georgia, serif',
    fontStyle: 'italic',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 3px 18px rgba(212,112,42,0.3)',
    letterSpacing: '-0.01em',
  },
  hero: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    padding: '24px 0 28px',
    gap: 20,
  },
  heroLeft: {},
  greeting: {
    fontFamily: 'Fraunces, Georgia, serif',
    fontSize: 'clamp(28px, 5vw, 42px)',
    fontWeight: 600,
    letterSpacing: '-0.025em',
    color: 'var(--text)',
    lineHeight: 1.1,
    marginBottom: 8,
  },
  langs: {
    fontFamily: 'Overpass Mono, monospace',
    fontSize: 12,
    color: 'var(--muted)',
    marginBottom: 4,
  },
  arrowSep: { margin: '0 8px', color: 'var(--dim)' },
  cefrLabel: {
    fontFamily: 'Overpass Mono, monospace',
    fontSize: 11,
    color: 'var(--muted)',
    letterSpacing: '0.04em',
  },
  heroRight: { textAlign: 'right', flexShrink: 0 },
  cefrDisplay: {
    fontFamily: 'Fraunces, Georgia, serif',
    fontSize: 'clamp(52px, 10vw, 80px)',
    fontWeight: 700,
    letterSpacing: '-0.04em',
    color: 'var(--accent)',
    lineHeight: 1,
    textShadow: '0 0 40px rgba(212,112,42,0.3)',
  },
  sessionCount: {
    fontFamily: 'Overpass Mono, monospace',
    fontSize: 11,
    color: 'var(--dim)',
    textAlign: 'right',
    marginTop: 4,
  },
  rule: {
    height: 1,
    background: 'linear-gradient(90deg, var(--border) 0%, transparent 80%)',
    marginBottom: 24,
  },
  card: { padding: '22px 22px 20px', marginBottom: 16 },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 14,
    marginBottom: 0,
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
  tableHeader: {
    display: 'flex',
    padding: '0 0 10px',
    fontSize: 10,
    letterSpacing: '0.13em',
    textTransform: 'uppercase',
    color: 'var(--dim)',
    fontFamily: 'Overpass Mono, monospace',
    borderBottom: '1px solid var(--border-subtle)',
    marginBottom: 4,
  },
  tableRow: isLast => ({
    display: 'flex',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
    gap: 8,
  }),
  rowTitle: {
    flex: 1,
    fontFamily: 'Fraunces, Georgia, serif',
    fontSize: 14,
    fontWeight: 400,
    color: 'var(--text)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginRight: 8,
  },
  rowDate: {
    width: 140,
    fontFamily: 'Overpass Mono, monospace',
    fontSize: 11,
    color: 'var(--muted)',
  },
  rowCefr: {
    width: 60,
    textAlign: 'right',
    fontFamily: 'Fraunces, Georgia, serif',
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--accent)',
  },
  empty: {
    textAlign: 'center',
    color: 'var(--muted)',
    fontSize: 13,
    padding: '28px 16px',
    fontFamily: 'Overpass Mono, monospace',
  },
  emptyLink: {
    background: 'none',
    border: 'none',
    color: 'var(--accent)',
    cursor: 'pointer',
    fontFamily: 'Fraunces, Georgia, serif',
    fontStyle: 'italic',
    fontSize: 14,
    fontWeight: 600,
    padding: 0,
  },
}
