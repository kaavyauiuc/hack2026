import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getUserProfile,
  updateUserProfile,
  addUserLanguage,
  removeUserLanguage,
} from '../services/api.js'
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

const ALL_LANGUAGES = ['spa', 'fra', 'deu', 'cmn', 'jpn', 'por', 'hin']
const NATIVE_LANGUAGES = ['eng', 'spa', 'fra', 'deu', 'cmn', 'jpn', 'por', 'hin']

export default function Profile() {
  const navigate = useNavigate()
  const userId = localStorage.getItem('user_id')

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Edit mode state
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState('')
  const [editNative, setEditNative] = useState('')
  const [saving, setSaving] = useState(false)

  // Add language state
  const [showAddLang, setShowAddLang] = useState(false)
  const [addLangCode, setAddLangCode] = useState('')
  const [addLangCefr, setAddLangCefr] = useState('A1')
  const [addingLang, setAddingLang] = useState(false)
  const [addLangError, setAddLangError] = useState('')

  useEffect(() => {
    if (!userId) { navigate('/onboarding'); return }
    loadProfile()
  }, [userId, navigate])

  async function loadProfile() {
    setLoading(true)
    try {
      const prof = await getUserProfile(userId)
      setProfile(prof)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  // ── Active language progress ─────────────────────────────────
  const activeLangProgress = profile
    ? (profile.languages || []).find(l => l.language === profile.active_language)
    : null

  const activeCefrIndex = CEFR_ORDER.indexOf(activeLangProgress?.current_cefr_level ?? 'A1')
  const firstSession = activeLangProgress?.history?.length > 0 ? activeLangProgress.history[0] : null

  // ── Switch active language ───────────────────────────────────
  async function handleSwitchLanguage(lang) {
    if (lang === profile.active_language) return
    try {
      const updated = await updateUserProfile(userId, { active_language: lang })
      setProfile(updated)
      localStorage.setItem('target_language', lang)
    } catch (e) {
      setError('Failed to switch language.')
    }
  }

  // ── Remove language ──────────────────────────────────────────
  async function handleRemoveLanguage(lang) {
    if ((profile.languages || []).length <= 1) return
    try {
      const updated = await removeUserLanguage(userId, lang)
      setProfile(updated)
      if (lang === localStorage.getItem('target_language')) {
        localStorage.setItem('target_language', updated.active_language)
      }
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to remove language.')
    }
  }

  // ── Save profile edits ───────────────────────────────────────
  async function handleSaveEdit() {
    setSaving(true)
    setError('')
    try {
      const updated = await updateUserProfile(userId, { name: editName, native_language: editNative })
      setProfile(updated)
      setEditMode(false)
    } catch (e) {
      setError('Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  function enterEditMode() {
    setEditName(profile.name)
    setEditNative(profile.native_language)
    setEditMode(true)
  }

  // ── Add language ─────────────────────────────────────────────
  async function handleAddLanguage() {
    if (!addLangCode) { setAddLangError('Select a language.'); return }
    setAddingLang(true)
    setAddLangError('')
    try {
      const updated = await addUserLanguage(userId, addLangCode, addLangCefr)
      setProfile(updated)
      setShowAddLang(false)
      setAddLangCode('')
      setAddLangCefr('A1')
    } catch (e) {
      setAddLangError(e?.response?.data?.detail || 'Failed to add language.')
    } finally {
      setAddingLang(false)
    }
  }

  if (loading) {
    return (
      <div className="grid-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="spinner" style={{ width: 24, height: 24 }} />
      </div>
    )
  }

  if (!profile) return null

  const enrolledCodes = (profile.languages || []).map(l => l.language)
  const availableToAdd = ALL_LANGUAGES.filter(l => !enrolledCodes.includes(l))

  return (
    <div className="grid-bg" style={s.page}>
      <div style={s.inner}>

        <div className="reveal-0"><Nav /></div>

        {/* Profile hero */}
        <div className="reveal-1" style={s.hero}>
          <div style={s.avatar}>
            <span style={s.avatarInitial}>{profile.name[0].toUpperCase()}</span>
          </div>
          <div style={s.heroText}>
            {editMode ? (
              <div style={s.editForm}>
                <input
                  style={s.input}
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Name"
                />
                <select
                  style={s.select}
                  value={editNative}
                  onChange={e => setEditNative(e.target.value)}
                >
                  {NATIVE_LANGUAGES.map(l => (
                    <option key={l} value={l}>{LANG_FLAGS[l]} {LANG_NAMES[l]}</option>
                  ))}
                </select>
                <div style={s.editBtns}>
                  <button style={s.btnSave} onClick={handleSaveEdit} disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button style={s.btnCancel} onClick={() => setEditMode(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div style={s.nameRow}>
                  <h1 style={s.name}>{profile.name}</h1>
                  <button style={s.editIcon} onClick={enterEditMode} title="Edit profile">✎</button>
                </div>
                <div style={s.since}>
                  Native: {LANG_NAMES[profile.native_language] ?? profile.native_language}
                  {firstSession
                    ? ` · Learning since ${new Date(firstSession.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
                    : ''}
                </div>
              </>
            )}
          </div>
        </div>

        {error && <div style={s.errorBanner}>{error}</div>}

        <div className="reveal-1" style={s.rule} />

        {/* Languages section */}
        <div className="reveal-2">
          <div className="label-caps" style={{ marginBottom: 14 }}>Languages</div>
          <div style={s.langGrid}>
            {(profile.languages || []).map(lp => {
              const isActive = lp.language === profile.active_language
              const sessCount = (lp.history || []).length
              return (
                <div
                  key={lp.language}
                  style={s.langCard(isActive)}
                  onClick={() => handleSwitchLanguage(lp.language)}
                >
                  {isActive && <span style={s.activeBadge}>Active</span>}
                  {(profile.languages || []).length > 1 && (
                    <button
                      style={s.removeBtn}
                      onClick={e => { e.stopPropagation(); handleRemoveLanguage(lp.language) }}
                      title="Remove language"
                    >✕</button>
                  )}
                  <div style={s.langCardFlag}>{LANG_FLAGS[lp.language] ?? '🌐'}</div>
                  <div style={s.langCardName}>{LANG_NAMES[lp.language] ?? lp.language}</div>
                  <div style={s.langCardNative}>{LANG_NATIVE[lp.language] ?? ''}</div>
                  <div style={s.langCardLevel}>{lp.current_cefr_level}</div>
                  <div style={s.langCardSessions}>{sessCount} session{sessCount !== 1 ? 's' : ''}</div>
                </div>
              )
            })}

            {/* Add language button */}
            {availableToAdd.length > 0 && !showAddLang && (
              <button style={s.addLangBtn} onClick={() => setShowAddLang(true)}>
                <span style={{ fontSize: 22, lineHeight: 1 }}>＋</span>
                <span style={{ marginTop: 4, fontFamily: 'Overpass Mono, monospace', fontSize: 10 }}>Add language</span>
              </button>
            )}
          </div>
        </div>

        {/* Inline add-language form */}
        {showAddLang && (
          <div className="reveal-2 card" style={{ ...s.card, marginTop: 14 }}>
            <div className="label-caps" style={{ marginBottom: 14 }}>Add a new language</div>
            <div style={s.addLangGrid}>
              {availableToAdd.map(l => (
                <button
                  key={l}
                  style={s.langPickBtn(addLangCode === l)}
                  onClick={() => setAddLangCode(l)}
                >
                  <span style={{ fontSize: 20 }}>{LANG_FLAGS[l]}</span>
                  <span style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 13 }}>{LANG_NAMES[l]}</span>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 16, marginBottom: 10 }}>
              <div className="label-caps" style={{ marginBottom: 8 }}>Starting level</div>
              <div style={s.cefrSegment}>
                {CEFR_ORDER.map(c => (
                  <button
                    key={c}
                    style={s.cefrSegBtn(addLangCefr === c)}
                    onClick={() => setAddLangCefr(c)}
                  >{c}</button>
                ))}
              </div>
            </div>
            {addLangError && <div style={s.addLangErr}>{addLangError}</div>}
            <div style={s.editBtns}>
              <button style={s.btnSave} onClick={handleAddLanguage} disabled={addingLang || !addLangCode}>
                {addingLang ? 'Adding…' : 'Add'}
              </button>
              <button style={s.btnCancel} onClick={() => { setShowAddLang(false); setAddLangCode(''); setAddLangError('') }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="reveal-3" style={s.statsRow}>
          <div className="card" style={s.statCard}>
            <div className="label-caps" style={{ marginBottom: 10 }}>Current level</div>
            <div style={s.statBig}>{activeLangProgress?.current_cefr_level ?? 'A1'}</div>
            <div style={s.statSub}>{CEFR_LABELS[activeLangProgress?.current_cefr_level] ?? ''}</div>
          </div>
          <div className="card" style={s.statCard}>
            <div className="label-caps" style={{ marginBottom: 10 }}>Sessions</div>
            <div style={s.statBig}>{activeLangProgress?.history?.length ?? 0}</div>
            <div style={s.statSub}>in {LANG_NAMES[profile.active_language] ?? profile.active_language}</div>
          </div>
          <div className="card" style={s.statCard}>
            <div className="label-caps" style={{ marginBottom: 10 }}>Last session</div>
            {(() => {
              const hist = activeLangProgress?.history ?? []
              const last = hist.length > 0 ? hist[hist.length - 1] : null
              return (
                <>
                  <div style={{ ...s.statBig, fontSize: 18 }}>
                    {last ? new Date(last.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                  </div>
                  <div style={s.statSub}>{last ? last.lesson_title || 'Untitled' : 'none yet'}</div>
                </>
              )
            })()}
          </div>
        </div>

        {/* CEFR progress bar */}
        <div className="reveal-3 card" style={s.card}>
          <div className="label-caps" style={{ marginBottom: 18 }}>
            CEFR progression — {LANG_NAMES[profile.active_language] ?? profile.active_language}
          </div>
          <div style={s.cefrTrack}>
            {CEFR_ORDER.map((c, i) => (
              <div key={c} style={s.cefrStep}>
                <div style={s.cefrDot(i <= activeCefrIndex, i === activeCefrIndex)} />
                {i < CEFR_ORDER.length - 1 && (
                  <div style={s.cefrLine(i < activeCefrIndex)} />
                )}
                <div style={s.cefrLabel(i === activeCefrIndex)}>{c}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Strengths + weaknesses */}
        {(activeLangProgress?.strengths?.length > 0 || activeLangProgress?.weaknesses?.length > 0) && (
          <div className="reveal-4" style={s.twoCol}>
            {activeLangProgress.strengths?.length > 0 && (
              <div className="card" style={s.card}>
                <div className="label-caps" style={{ marginBottom: 14 }}>Strengths</div>
                <div style={s.tagCloud}>
                  {activeLangProgress.strengths.map((t, i) => (
                    <span key={i} style={s.tagGreen}>{t}</span>
                  ))}
                </div>
              </div>
            )}
            {activeLangProgress.weaknesses?.length > 0 && (
              <div className="card" style={s.card}>
                <div className="label-caps" style={{ marginBottom: 14 }}>To improve</div>
                <div style={s.tagCloud}>
                  {activeLangProgress.weaknesses.map((t, i) => (
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
    alignItems: 'flex-start',
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
  heroText: { flex: 1 },
  nameRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 },
  name: {
    fontFamily: 'Fraunces, Georgia, serif',
    fontSize: 'clamp(26px, 5vw, 38px)',
    fontWeight: 600,
    letterSpacing: '-0.025em',
    color: 'var(--text)',
    lineHeight: 1.1,
  },
  editIcon: {
    background: 'none',
    border: 'none',
    color: 'var(--dim)',
    cursor: 'pointer',
    fontSize: 16,
    padding: '2px 4px',
    transition: 'color 0.15s',
  },
  since: {
    fontFamily: 'Overpass Mono, monospace',
    fontSize: 11,
    color: 'var(--muted)',
  },

  editForm: { display: 'flex', flexDirection: 'column', gap: 10 },
  input: {
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text)',
    fontFamily: 'Fraunces, Georgia, serif',
    fontSize: 18,
    padding: '8px 12px',
    outline: 'none',
    width: '100%',
  },
  select: {
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text)',
    fontFamily: 'Overpass Mono, monospace',
    fontSize: 12,
    padding: '8px 12px',
    outline: 'none',
    width: '100%',
  },
  editBtns: { display: 'flex', gap: 8, marginTop: 4 },
  btnSave: {
    padding: '8px 20px',
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontFamily: 'Fraunces, Georgia, serif',
    fontStyle: 'italic',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnCancel: {
    padding: '8px 16px',
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--muted)',
    fontFamily: 'Overpass Mono, monospace',
    fontSize: 12,
    cursor: 'pointer',
  },

  errorBanner: {
    padding: '10px 14px',
    background: 'rgba(212,112,42,0.12)',
    border: '1px solid rgba(212,112,42,0.3)',
    borderRadius: 8,
    color: 'var(--accent-bright)',
    fontFamily: 'Overpass Mono, monospace',
    fontSize: 12,
    marginBottom: 14,
  },

  rule: {
    height: 1,
    background: 'linear-gradient(90deg, var(--border) 0%, transparent 80%)',
    marginBottom: 24,
  },

  langGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: 12,
    marginBottom: 14,
  },
  langCard: isActive => ({
    position: 'relative',
    padding: '16px 14px 14px',
    background: 'var(--surface-2)',
    border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    transition: 'border-color 0.15s, box-shadow 0.15s',
    boxShadow: isActive ? '0 0 0 1px var(--accent)' : 'none',
  }),
  activeBadge: {
    position: 'absolute',
    top: 7,
    left: 8,
    fontFamily: 'Overpass Mono, monospace',
    fontSize: 9,
    color: 'var(--accent)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  removeBtn: {
    position: 'absolute',
    top: 5,
    right: 7,
    background: 'none',
    border: 'none',
    color: 'var(--dim)',
    cursor: 'pointer',
    fontSize: 11,
    padding: '2px 4px',
    transition: 'color 0.15s',
  },
  langCardFlag: { fontSize: 30, lineHeight: 1, marginTop: 8 },
  langCardName: {
    fontFamily: 'Fraunces, Georgia, serif',
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--text)',
  },
  langCardNative: {
    fontFamily: 'Fraunces, Georgia, serif',
    fontStyle: 'italic',
    fontSize: 12,
    color: 'var(--muted)',
  },
  langCardLevel: {
    fontFamily: 'Fraunces, Georgia, serif',
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--accent)',
    marginTop: 4,
  },
  langCardSessions: {
    fontFamily: 'Overpass Mono, monospace',
    fontSize: 9,
    color: 'var(--dim)',
  },

  addLangBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: '16px 14px',
    background: 'none',
    border: '1px dashed var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--muted)',
    cursor: 'pointer',
    minHeight: 130,
    transition: 'border-color 0.15s, color 0.15s',
  },

  addLangGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: 8,
  },
  langPickBtn: isSelected => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '10px 8px',
    background: isSelected ? 'var(--accent-dim)' : 'var(--surface-2)',
    border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.15s',
  }),

  cefrSegment: { display: 'flex', gap: 4 },
  cefrSegBtn: isSelected => ({
    padding: '6px 12px',
    background: isSelected ? 'var(--accent)' : 'var(--surface-2)',
    border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 6,
    color: isSelected ? '#fff' : 'var(--muted)',
    fontFamily: 'Overpass Mono, monospace',
    fontSize: 11,
    cursor: 'pointer',
    transition: 'all 0.15s',
  }),

  addLangErr: {
    fontFamily: 'Overpass Mono, monospace',
    fontSize: 11,
    color: 'var(--accent-bright)',
    marginBottom: 8,
  },

  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
    marginBottom: 14,
    marginTop: 14,
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
