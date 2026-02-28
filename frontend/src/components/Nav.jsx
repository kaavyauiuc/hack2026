import { useNavigate, useLocation } from 'react-router-dom'

export default function Nav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav style={s.nav}>
      <button style={s.brand} onClick={() => navigate('/dashboard')}>
        LinguaAI
      </button>
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
