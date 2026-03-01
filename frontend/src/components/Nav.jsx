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
          <span style={s.brandL}>Lingua</span><span style={s.brandR}>AI</span>
        </button>
        {activeLanguage && LANG_FLAGS[activeLanguage] && (
          <span style={s.langPill}>
            {LANG_FLAGS[activeLanguage]}&thinsp;{LANG_NAMES[activeLanguage] ?? activeLanguage}
          </span>
        )}
      </div>
      <div style={s.links}>
        <NavLink label="dashboard" to="/dashboard" active={pathname === '/dashboard'} navigate={navigate} />
        <NavLink label="profile"   to="/profile"   active={pathname === '/profile'}   navigate={navigate} />
        <button style={s.sessionBtn} onClick={() => navigate('/session')}>
          new session ↗
        </button>
      </div>
    </nav>
  )
}

function NavLink({ label, to, active, navigate }) {
  return (
    <button style={s.link(active)} onClick={() => navigate(to)}>
      {label}
      {active && <span style={s.linkUnderline} />}
    </button>
  )
}

const s = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '22px 0',
    marginBottom: 8,
    borderBottom: '1px solid var(--border-subtle)',
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  brand: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'baseline',
    gap: 0,
  },
  brandL: {
    fontFamily: 'Instrument Serif, Georgia, serif',
    fontStyle: 'italic',
    fontSize: 18,
    fontWeight: 400,
    color: 'var(--accent)',
    letterSpacing: '-0.01em',
  },
  brandR: {
    fontFamily: 'Martian Mono, monospace',
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--muted)',
    letterSpacing: '0.04em',
  },
  langPill: {
    padding: '3px 10px',
    background: 'var(--accent-dim)',
    border: '1px solid rgba(15,82,160,0.2)',
    borderRadius: 20,
    fontFamily: 'Martian Mono, monospace',
    fontSize: 9,
    fontWeight: 400,
    color: 'var(--accent)',
    letterSpacing: '0.06em',
    whiteSpace: 'nowrap',
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  },
  link: active => ({
    position: 'relative',
    padding: '6px 12px',
    background: 'none',
    border: 'none',
    color: active ? 'var(--accent)' : 'var(--muted)',
    fontFamily: 'Martian Mono, monospace',
    fontSize: 10,
    fontWeight: active ? 500 : 400,
    letterSpacing: '0.06em',
    cursor: 'pointer',
    transition: 'color 0.15s',
  }),
  linkUnderline: {
    position: 'absolute',
    bottom: 2,
    left: 12,
    right: 12,
    height: 1,
    background: 'var(--accent)',
    borderRadius: 1,
    display: 'block',
  },
  sessionBtn: {
    marginLeft: 10,
    padding: '7px 15px',
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 6,
    color: '#fff',
    fontFamily: 'Martian Mono, monospace',
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: '0.04em',
    cursor: 'pointer',
    boxShadow: '0 2px 12px rgba(15,82,160,0.28)',
    transition: 'box-shadow 0.15s, background 0.15s',
  },
}
