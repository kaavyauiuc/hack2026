import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserProfile, getSessionHistory } from '../services/api.js'
import ProgressChart from '../components/ProgressChart.jsx'

const s = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)',
    padding: '24px 16px',
  },
  inner: {
    maxWidth: 720,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  startBtn: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    border: 'none',
    borderRadius: 10,
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 14,
  },
  card: {
    background: '#12121f',
    border: '1px solid #1e293b',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#94a3b8',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  cefrBig: {
    fontSize: 48,
    fontWeight: 800,
    background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  tag: (color) => ({
    display: 'inline-block',
    padding: '4px 10px',
    background: color || '#1e293b',
    borderRadius: 6,
    fontSize: 12,
    color: '#cbd5e1',
    margin: '3px 3px 3px 0',
  }),
  sessionCard: {
    background: '#0f0f1a',
    border: '1px solid #1e293b',
    borderRadius: 10,
    padding: '14px 16px',
    marginBottom: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionDate: { color: '#64748b', fontSize: 12 },
  sessionCefr: {
    padding: '4px 12px',
    background: 'rgba(99,102,241,0.2)',
    borderRadius: 20,
    color: '#a5b4fc',
    fontSize: 13,
    fontWeight: 600,
  },
  emptyState: {
    textAlign: 'center',
    color: '#64748b',
    padding: '32px 16px',
    fontSize: 14,
  },
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
        const [prof, hist] = await Promise.all([
          getUserProfile(userId),
          getSessionHistory(userId),
        ])
        setProfile(prof)
        setHistory(hist)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId, navigate])

  if (loading) {
    return (
      <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#64748b' }}>Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <div style={s.inner}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.title}>Dashboard</div>
          <button style={s.startBtn} onClick={() => navigate('/session')}>
            New Session +
          </button>
        </div>

        {/* Profile summary */}
        {profile && (
          <div style={s.card}>
            <div style={s.cardTitle}>Profile</div>
            <p style={{ color: '#e2e8f0', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
              {profile.name}
            </p>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
              Learning: {profile.target_language.toUpperCase()} · Native: {profile.native_language.toUpperCase()}
            </p>
            <div style={s.cefrBig}>{profile.current_cefr_level}</div>
            <p style={{ color: '#64748b', fontSize: 12, marginTop: 4, marginBottom: 16 }}>Current CEFR level</p>

            {profile.weaknesses?.length > 0 && (
              <>
                <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6 }}>AREAS TO IMPROVE</div>
                {profile.weaknesses.map((w, i) => (
                  <span key={i} style={s.tag('rgba(239,68,68,0.15)')}>{w}</span>
                ))}
              </>
            )}
          </div>
        )}

        {/* CEFR progress chart */}
        <div style={s.card}>
          <div style={s.cardTitle}>CEFR Progress</div>
          <ProgressChart history={history} />
        </div>

        {/* Session history */}
        <div style={s.card}>
          <div style={s.cardTitle}>Session History ({history.length})</div>
          {history.length === 0 ? (
            <div style={s.emptyState}>No sessions yet. Start your first session!</div>
          ) : (
            [...history].reverse().map((session, i) => (
              <div key={i} style={s.sessionCard}>
                <div>
                  <div style={{ color: '#e2e8f0', fontSize: 14, marginBottom: 2 }}>
                    Session {history.length - i}
                  </div>
                  <div style={s.sessionDate}>
                    {new Date(session.date).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                </div>
                <div style={s.sessionCefr}>{session.cefr_estimate}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
