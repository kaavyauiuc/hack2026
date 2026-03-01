import { useNavigate, useLocation } from 'react-router-dom'

const LANG_FLAGS = {
  spa: '🇪🇸', fra: '🇫🇷', deu: '🇩🇪',
  cmn: '🇨🇳', jpn: '🇯🇵', por: '🇧🇷', hin: '🇮🇳', eng: '🇬🇧',
}

const LANG_NAMES = {
  spa: 'Spanish', fra: 'French', deu: 'German',
  cmn: 'Mandarin', jpn: 'Japanese', por: 'Portuguese', hin: 'Hindi', eng: 'English',
}

export default function Nav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const activeLanguage = localStorage.getItem('target_language')

  return (
    <nav style={s.nav}>
      <div style={s.brandRow}>
        <button style={s.brand} onClick={() => navigate('/dashboard')}>
          LinguaAI
        </button>
        {activeLanguage && LANG_FLAGS[activeLanguage] && (
          <span style={s.langPill}>
            {LANG_FLAGS[activeLanguage]} {LANG_NAMES[activeLanguage] ?? activeLanguage}
          </span>
        )}
      </div>
      <div style={s.links}>
        <NavLink label="Dashboard" to="/dashboard" active={pathname === '/dashboard'} navigate={navigate} />
        <NavLink label="Profile"   to="/profile"   active={pathname === '/profile'}   navigate={navigate} />
        <button style={s.sessionBtn} onClick={() => navigate('/session')}>
          New session →
        </button>
      </div>
    </nav>
  )
}

function NavLink({ label, to, active, navigate }) {
  return (
    <button style={s.link(active)} onClick={() => navigate(to)}>
      {label}
    </button>
  )
}

const s = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 0',
    marginBottom: 8,
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  brand: {
    fontFamily: 'Fraunces, Georgia, serif',
    fontStyle: 'italic',
    fontSize: 16,
    fontWeight: 500,
    color: 'var(--muted)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  langPill: {
    padding: '3px 9px',
    background: 'var(--accent-dim)',
    border: '1px solid rgba(212,112,42,0.3)',
    borderRadius: 20,
    fontFamily: 'Overpass Mono, monospace',
    fontSize: 10,
    color: 'var(--accent-bright)',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  link: active => ({
    padding: '6px 12px',
    background: active ? 'var(--surface-2)' : 'none',
    border: active ? '1px solid var(--border)' : '1px solid transparent',
    borderRadius: 8,
    color: active ? 'var(--text)' : 'var(--muted)',
    fontFamily: 'Overpass Mono, monospace',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.15s',
  }),
  sessionBtn: {
    marginLeft: 8,
    padding: '7px 14px',
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontFamily: 'Fraunces, Georgia, serif',
    fontStyle: 'italic',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 3px 14px rgba(212,112,42,0.28)',
  },
}
