import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserProfile, getSessionHistory } from '../services/api.js'
import ProgressChart from '../components/ProgressChart.jsx'
import Nav from '../components/Nav.jsx'

const LANG_NAMES = {
  spa: 'Spanish', fra: 'French', deu: 'German',
  cmn: 'Mandarin', jpn: 'Japanese', por: 'Portuguese', hin: 'Hindi', eng: 'English',
}

const CEFR_LABELS = {
  A1: 'Beginner', A2: 'Elementary', B1: 'Intermediate',
  B2: 'Upper-intermediate', C1: 'Advanced', C2: 'Mastery',
}

const HELLO_IN = {
  spa: 'Hola',
  fra: 'Bonjour',
  deu: 'Hallo',
  cmn: '你好',
  jpn: 'こんにちは',
  por: 'Olá',
  hin: 'नमस्ते',
  eng: 'Hello',
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

  // Find the active language's progress record
  const activeLangProgress = profile
    ? (profile.languages || []).find(l => l.language === profile.active_language)
    : null

  // Filter history to active language only
  const activeHistory = activeLangProgress ? (activeLangProgress.history || []) : history
  const reversedHistory = [...activeHistory].reverse()

  return (
    <div className="grid-bg" style={s.page}>
      <div style={s.inner}>

        <div className="reveal-0"><Nav /></div>

        {profile && (
          <>
            {/* Hero */}
            <div className="reveal-1" style={s.hero}>
              <div style={s.heroLeft}>
                <div style={s.eyebrow}>
                  {LANG_NAMES[profile.native_language] || profile.native_language}
                  <span style={s.arrowSep}>→</span>
                  {LANG_NAMES[profile.active_language] || profile.active_language}
                </div>
                <div style={s.greeting}>
                  <em style={{ fontStyle: 'italic', fontWeight: 400 }}>
                    {HELLO_IN[profile.active_language] ?? 'Hello'},
                  </em>{' '}
                  {profile.name}
                </div>
                <div style={s.cefrLabel}>
                  {CEFR_LABELS[activeLangProgress?.current_cefr_level] || ''}
                </div>
              </div>
              <div style={s.heroRight}>
                <div style={s.cefrRing}>
                  <div style={s.cefrDisplay}>{activeLangProgress?.current_cefr_level ?? 'A1'}</div>
                </div>
                <div style={s.sessionCount}>
                  {activeHistory.length} session{activeHistory.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="reveal-1" style={s.rule} />
          </>
        )}

        {/* CEFR chart */}
        <div className="reveal-2 card" style={s.card}>
          <div className="label-caps" style={{ marginBottom: 18 }}>progress</div>
          <ProgressChart history={activeHistory} />
        </div>

        {/* Strengths / Weaknesses */}
        {activeLangProgress && (activeLangProgress.strengths?.length > 0 || activeLangProgress.weaknesses?.length > 0) && (
          <div className="reveal-3" style={s.twoCol}>
            {activeLangProgress.strengths?.length > 0 && (
              <div className="card" style={s.card}>
                <div className="label-caps" style={{ marginBottom: 14 }}>strengths</div>
                <div style={s.tagCloud}>
                  {activeLangProgress.strengths.map((t, i) => (
                    <span key={i} style={s.tagGreen}>{t}</span>
                  ))}
                </div>
              </div>
            )}
            {activeLangProgress.weaknesses?.length > 0 && (
              <div className="card" style={s.card}>
                <div className="label-caps" style={{ marginBottom: 14 }}>to improve</div>
                <div style={s.tagCloud}>
                  {activeLangProgress.weaknesses.map((t, i) => (
                    <span key={i} style={s.tagBlue}>{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Session history */}
        <div className="reveal-4 card" style={{ ...s.card, marginBottom: 48 }}>
          <div style={s.historyHeader}>
            <div className="label-caps">session history</div>
            {activeHistory.length > 0 && (
              <span style={s.historyCount}>{activeHistory.length} total</span>
            )}
          </div>

          {activeHistory.length === 0 ? (
            <div style={s.empty}>
              no sessions yet.{' '}
              <button onClick={() => navigate('/session')} style={s.emptyLink}>
                start your first ↗
              </button>
            </div>
          ) : (
            <div>
              <div style={s.tableHeader}>
                <span style={{ flex: 1 }}>lesson</span>
                <span style={{ width: 130 }}>date</span>
                <span style={{ width: 56, textAlign: 'right' }}>level</span>
              </div>
              {reversedHistory.map((session, i) => (
                <div key={i} style={s.tableRow(i === reversedHistory.length - 1)}>
                  <span style={s.rowTitle}>
                    {session.lesson_title || `session ${activeHistory.length - i}`}
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

  hero: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    padding: '28px 0 32px',
    gap: 20,
  },
  heroLeft: {},
  eyebrow: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--accent)',
    letterSpacing: '0.10em',
    marginBottom: 10,
    opacity: 0.8,
  },
  arrowSep: { margin: '0 8px', color: 'var(--dim)' },
  greeting: {
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(30px, 5.5vw, 48px)',
    fontWeight: 400,
    letterSpacing: '-0.02em',
    color: 'var(--text)',
    lineHeight: 1.1,
    marginBottom: 8,
  },
  cefrLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--muted)',
    letterSpacing: '0.08em',
    fontWeight: 300,
  },
  heroRight: { textAlign: 'right', flexShrink: 0 },
  cefrRing: {
    width: 100,
    height: 100,
    borderRadius: '50%',
    border: '2px solid var(--accent)',
    boxShadow: '0 0 0 8px var(--accent-dim), inset 0 0 0 8px var(--accent-dim)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
    marginBottom: 8,
  },
  cefrDisplay: {
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(38px, 7vw, 54px)',
    fontWeight: 400,
    letterSpacing: '-0.04em',
    color: 'var(--accent)',
    lineHeight: 1,
  },
  sessionCount: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--dim)',
    textAlign: 'right',
    letterSpacing: '0.04em',
  },
  rule: {
    height: 1,
    background: 'linear-gradient(90deg, var(--accent) 0%, transparent 70%)',
    opacity: 0.25,
    marginBottom: 24,
  },
  card: { padding: '22px 22px 20px', marginBottom: 14 },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 12,
    marginBottom: 0,
  },
  tagCloud: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  tagGreen: {
    padding: '4px 10px',
    background: 'var(--sage-dim)',
    border: '1px solid rgba(55,107,82,0.22)',
    borderRadius: 20,
    fontSize: 10,
    color: 'var(--sage)',
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.04em',
  },
  tagBlue: {
    padding: '4px 10px',
    background: 'var(--accent-dim)',
    border: '1px solid rgba(15,82,160,0.18)',
    borderRadius: 20,
    fontSize: 10,
    color: 'var(--accent)',
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.04em',
  },
  historyHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  historyCount: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--dim)',
    letterSpacing: '0.06em',
  },
  tableHeader: {
    display: 'flex',
    padding: '0 0 10px',
    fontSize: 9,
    letterSpacing: '0.18em',
    textTransform: 'lowercase',
    color: 'var(--dim)',
    fontFamily: 'var(--font-mono)',
    borderBottom: '1px solid var(--border-subtle)',
    marginBottom: 4,
  },
  tableRow: isLast => ({
    display: 'flex',
    alignItems: 'center',
    padding: '11px 0',
    borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
    gap: 8,
  }),
  rowTitle: {
    flex: 1,
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: 15,
    fontWeight: 400,
    color: 'var(--text)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginRight: 8,
  },
  rowDate: {
    width: 130,
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--muted)',
    letterSpacing: '0.04em',
  },
  rowCefr: {
    width: 56,
    textAlign: 'right',
    fontFamily: 'var(--font-display)',
    fontSize: 18,
    fontWeight: 400,
    color: 'var(--accent)',
  },
  empty: {
    textAlign: 'center',
    color: 'var(--muted)',
    fontSize: 11,
    padding: '28px 16px',
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.04em',
  },
  emptyLink: {
    background: 'none',
    border: 'none',
    color: 'var(--accent)',
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: 15,
    fontWeight: 400,
    padding: 0,
  },
}
