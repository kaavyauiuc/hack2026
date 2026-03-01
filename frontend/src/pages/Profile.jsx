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

  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState('')
  const [editNative, setEditNative] = useState('')
  const [saving, setSaving] = useState(false)

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

  const activeLangProgress = profile
    ? (profile.languages || []).find(l => l.language === profile.active_language)
    : null

  const activeCefrIndex = CEFR_ORDER.indexOf(activeLangProgress?.current_cefr_level ?? 'A1')
  const firstSession = activeLangProgress?.history?.length > 0 ? activeLangProgress.history[0] : null

  async function handleSwitchLanguage(lang) {
    if (lang === profile.active_language) return
    try {
      const updated = await updateUserProfile(userId, { active_language: lang })
      setProfile(updated)
      localStorage.setItem('target_language', lang)
    } catch { setError('Failed to switch language.') }
  }

  async function handleRemoveLanguage(lang) {
    if ((profile.languages || []).length <= 1) return
    try {
      const updated = await removeUserLanguage(userId, lang)
      setProfile(updated)
      if (lang === localStorage.getItem('target_language'))
        localStorage.setItem('target_language', updated.active_language)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to remove language.')
    }
  }

  async function handleSaveEdit() {
    setSaving(true); setError('')
    try {
      const updated = await updateUserProfile(userId, { name: editName, native_language: editNative })
      setProfile(updated); setEditMode(false)
    } catch { setError('Failed to save changes.') }
    finally { setSaving(false) }
  }

  function enterEditMode() {
    setEditName(profile.name); setEditNative(profile.native_language); setEditMode(true)
  }

  async function handleAddLanguage() {
    if (!addLangCode) { setAddLangError('Select a language.'); return }
    setAddingLang(true); setAddLangError('')
    try {
      const updated = await addUserLanguage(userId, addLangCode, addLangCefr)
      setProfile(updated); setShowAddLang(false); setAddLangCode(''); setAddLangCefr('A1')
    } catch (e) {
      setAddLangError(e?.response?.data?.detail || 'Failed to add language.')
    } finally { setAddingLang(false) }
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
                  style={s.editInput}
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Name"
                />
                <select
                  style={s.editSelect}
                  value={editNative}
                  onChange={e => setEditNative(e.target.value)}
                >
                  {NATIVE_LANGUAGES.map(l => (
                    <option key={l} value={l}>{LANG_FLAGS[l]} {LANG_NAMES[l]}</option>
                  ))}
                </select>
                <div style={s.editBtns}>
                  <button style={s.btnSave} onClick={handleSaveEdit} disabled={saving}>
                    {saving ? 'saving…' : 'save'}
                  </button>
                  <button style={s.btnCancel} onClick={() => setEditMode(false)}>cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div style={s.nameRow}>
                  <h1 style={s.name}>{profile.name}</h1>
                  <button style={s.editIcon} onClick={enterEditMode} title="Edit">✎</button>
                </div>
                <div style={s.since}>
                  native: {LANG_NAMES[profile.native_language] ?? profile.native_language}
                  {firstSession
                    ? ` · since ${new Date(firstSession.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
                    : ''}
                </div>
              </>
            )}
          </div>
        </div>

        {error && <div style={s.errorBanner}>{error}</div>}

        <div className="reveal-1" style={s.rule} />

        {/* Languages */}
        <div className="reveal-2">
          <div className="label-caps" style={{ marginBottom: 14 }}>languages</div>
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
                  {isActive && <div style={s.activeLine} />}
                  {(profile.languages || []).length > 1 && (
                    <button
                      style={s.removeBtn}
                      onClick={e => { e.stopPropagation(); handleRemoveLanguage(lp.language) }}
                    >×</button>
                  )}
                  <div style={s.langCardFlag}>{LANG_FLAGS[lp.language] ?? '🌐'}</div>
                  <div style={s.langCardName}>{LANG_NAMES[lp.language] ?? lp.language}</div>
                  <div style={s.langCardNative}>{LANG_NATIVE[lp.language] ?? ''}</div>
                  <div style={s.langCardLevel(isActive)}>{lp.current_cefr_level}</div>
                  <div style={s.langCardSessions}>{sessCount} session{sessCount !== 1 ? 's' : ''}</div>
                </div>
              )
            })}

            {availableToAdd.length > 0 && !showAddLang && (
              <button style={s.addLangBtn} onClick={() => setShowAddLang(true)}>
                <span style={{ fontSize: 24, lineHeight: 1, opacity: 0.4 }}>+</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em', opacity: 0.5 }}>
                  add language
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Inline add-language form */}
        {showAddLang && (
          <div className="reveal-2 card" style={{ ...s.card, marginTop: 12 }}>
            <div className="label-caps" style={{ marginBottom: 14 }}>enrol a new language</div>
            <div style={s.addLangGrid}>
              {availableToAdd.map(l => (
                <button
                  key={l}
                  style={s.langPickBtn(addLangCode === l)}
                  onClick={() => setAddLangCode(l)}
                >
                  <span style={{ fontSize: 18 }}>{LANG_FLAGS[l]}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 13 }}>
                    {LANG_NAMES[l]}
                  </span>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 16, marginBottom: 10 }}>
              <div className="label-caps" style={{ marginBottom: 8 }}>starting level</div>
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
                {addingLang ? 'adding…' : 'add'}
              </button>
              <button style={s.btnCancel} onClick={() => { setShowAddLang(false); setAddLangCode(''); setAddLangError('') }}>
                cancel
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="reveal-3" style={s.statsRow}>
          <div className="card" style={s.statCard}>
            <div className="label-caps" style={{ marginBottom: 10 }}>level</div>
            <div style={s.statBig}>{activeLangProgress?.current_cefr_level ?? 'A1'}</div>
            <div style={s.statSub}>{CEFR_LABELS[activeLangProgress?.current_cefr_level] ?? ''}</div>
          </div>
          <div className="card" style={s.statCard}>
            <div className="label-caps" style={{ marginBottom: 10 }}>sessions</div>
            <div style={s.statBig}>{activeLangProgress?.history?.length ?? 0}</div>
            <div style={s.statSub}>{LANG_NAMES[profile.active_language] ?? profile.active_language}</div>
          </div>
          <div className="card" style={s.statCard}>
            <div className="label-caps" style={{ marginBottom: 10 }}>last session</div>
            {(() => {
              const hist = activeLangProgress?.history ?? []
              const last = hist.length > 0 ? hist[hist.length - 1] : null
              return (
                <>
                  <div style={{ ...s.statBig, fontSize: 18 }}>
                    {last ? new Date(last.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                  </div>
                  <div style={s.statSub}>{last ? last.lesson_title || 'untitled' : 'none yet'}</div>
                </>
              )
            })()}
          </div>
        </div>

        {/* CEFR track */}
        <div className="reveal-3 card" style={s.card}>
          <div className="label-caps" style={{ marginBottom: 18 }}>
            cefr progression — {LANG_NAMES[profile.active_language] ?? profile.active_language}
          </div>
          <div style={s.cefrTrack}>
            {CEFR_ORDER.map((c, i) => (
              <div key={c} style={s.cefrStep}>
                <div style={s.cefrDot(i <= activeCefrIndex, i === activeCefrIndex)} />
                {i < CEFR_ORDER.length - 1 && <div style={s.cefrLine(i < activeCefrIndex)} />}
                <div style={s.cefrLabelText(i === activeCefrIndex)}>{c}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Strengths + weaknesses */}
        {(activeLangProgress?.strengths?.length > 0 || activeLangProgress?.weaknesses?.length > 0) && (
          <div className="reveal-4" style={s.twoCol}>
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

        {/* Reset */}
        <div className="reveal-5" style={s.resetRow}>
          <button style={s.resetBtn} onClick={() => { localStorage.clear(); navigate('/onboarding') }}>
            start fresh with a new profile
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
    padding: '24px 0 28px',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: '50%',
    background: 'var(--accent-dim)',
    border: '1.5px solid rgba(15,82,160,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitial: {
    fontFamily: 'var(--font-display)',
    fontSize: 26,
    fontWeight: 400,
    fontStyle: 'italic',
    color: 'var(--accent)',
  },
  heroText: { flex: 1 },
  nameRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 },
  name: {
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(26px, 5vw, 40px)',
    fontWeight: 400,
    letterSpacing: '-0.02em',
    color: 'var(--text)',
    lineHeight: 1.1,
  },
  editIcon: {
    background: 'none', border: 'none',
    color: 'var(--dim)', cursor: 'pointer', fontSize: 15, padding: '2px 4px',
  },
  since: {
    fontFamily: 'var(--font-mono)',
    fontSize: 12, color: 'var(--muted)',
    letterSpacing: '0.03em', fontWeight: 300,
  },

  editForm: { display: 'flex', flexDirection: 'column', gap: 10 },
  editInput: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 8, color: 'var(--text)',
    fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 20,
    padding: '9px 13px', outline: 'none', width: '100%',
  },
  editSelect: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 8, color: 'var(--text)',
    fontFamily: 'var(--font-mono)', fontSize: 13,
    padding: '9px 13px', outline: 'none', width: '100%', appearance: 'none',
  },
  editBtns: { display: 'flex', gap: 8, marginTop: 4 },
  btnSave: {
    padding: '8px 18px', background: 'var(--accent)', border: 'none', borderRadius: 6,
    color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 12,
    letterSpacing: '0.04em', cursor: 'pointer',
  },
  btnCancel: {
    padding: '8px 14px', background: 'none', border: '1px solid var(--border)',
    borderRadius: 6, color: 'var(--muted)', fontFamily: 'var(--font-mono)',
    fontSize: 12, letterSpacing: '0.04em', cursor: 'pointer',
  },

  errorBanner: {
    padding: '10px 14px', background: 'rgba(179,48,32,0.07)',
    border: '1px solid rgba(179,48,32,0.2)', borderRadius: 8,
    color: 'var(--red)', fontFamily: 'var(--font-mono)',
    fontSize: 12, letterSpacing: '0.03em', marginBottom: 14,
  },

  rule: {
    height: 1,
    background: 'linear-gradient(90deg, var(--accent) 0%, transparent 70%)',
    opacity: 0.2, marginBottom: 24,
  },

  langGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 10, marginBottom: 14,
  },
  langCard: isActive => ({
    position: 'relative',
    padding: '16px 12px 14px',
    background: isActive ? 'rgba(15,82,160,0.06)' : 'var(--surface)',
    border: `1px solid ${isActive ? 'rgba(15,82,160,0.35)' : 'var(--border)'}`,
    borderRadius: 'var(--radius-lg)',
    cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    transition: 'border-color 0.15s, background 0.15s',
    boxShadow: isActive ? '0 2px 12px rgba(15,82,160,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
    overflow: 'hidden',
  }),
  activeLine: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
    background: 'var(--accent)', borderRadius: '0 0 2px 2px',
  },
  removeBtn: {
    position: 'absolute', top: 6, right: 8,
    background: 'none', border: 'none', color: 'var(--dim)',
    cursor: 'pointer', fontSize: 14, padding: '2px 3px', lineHeight: 1,
  },
  langCardFlag: { fontSize: 28, lineHeight: 1, marginTop: 6 },
  langCardName: {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic', fontSize: 14, fontWeight: 400, color: 'var(--text)',
  },
  langCardNative: {
    fontFamily: 'var(--font-mono)', fontSize: 11,
    color: 'var(--muted)', letterSpacing: '0.03em',
  },
  langCardLevel: isActive => ({
    fontFamily: 'var(--font-display)',
    fontSize: 22, fontWeight: 400,
    color: isActive ? 'var(--accent)' : 'var(--muted)',
    marginTop: 4,
  }),
  langCardSessions: {
    fontFamily: 'var(--font-mono)', fontSize: 11,
    color: 'var(--dim)', letterSpacing: '0.04em',
  },

  addLangBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: '16px 12px', background: 'none',
    border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)',
    color: 'var(--text)', cursor: 'pointer', minHeight: 120,
    transition: 'border-color 0.15s',
  },

  addLangGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 6,
  },
  langPickBtn: isSelected => ({
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    padding: '9px 6px', cursor: 'pointer',
    background: isSelected ? 'var(--accent-dim)' : 'var(--surface-2)',
    border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 8, transition: 'all 0.12s',
  }),

  cefrSegment: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  cefrSegBtn: isSelected => ({
    padding: '6px 12px',
    background: isSelected ? 'var(--accent)' : 'var(--surface)',
    border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 6, color: isSelected ? '#fff' : 'var(--muted)',
    fontFamily: 'var(--font-mono)', fontSize: 12,
    cursor: 'pointer', transition: 'all 0.12s',
  }),

  addLangErr: {
    fontFamily: 'var(--font-mono)', fontSize: 12,
    color: 'var(--red)', marginBottom: 8, letterSpacing: '0.03em',
  },

  statsRow: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10, marginBottom: 12, marginTop: 12,
  },
  statCard: { padding: '18px 16px 16px', textAlign: 'center' },
  statBig: {
    fontFamily: 'var(--font-display)',
    fontSize: 38, fontWeight: 400,
    color: 'var(--accent)', lineHeight: 1, marginBottom: 4,
  },
  statSub: {
    fontFamily: 'var(--font-mono)', fontSize: 11,
    color: 'var(--dim)', letterSpacing: '0.05em',
  },

  card: { padding: '20px 22px 18px', marginBottom: 12 },

  cefrTrack: { display: 'flex', alignItems: 'flex-start', gap: 0 },
  cefrStep: {
    display: 'flex', alignItems: 'center', flex: 1,
    flexDirection: 'column', position: 'relative',
  },
  cefrDot: (filled, current) => ({
    width: current ? 14 : 9, height: current ? 14 : 9,
    borderRadius: '50%',
    background: filled ? 'var(--accent)' : 'var(--border)',
    border: `2px solid ${filled ? 'var(--accent)' : 'var(--border-subtle)'}`,
    boxShadow: current ? '0 0 0 4px var(--accent-dim)' : 'none',
    flexShrink: 0, zIndex: 1, marginBottom: 8, transition: 'all 0.2s',
  }),
  cefrLine: filled => ({
    position: 'absolute', top: 5, left: '50%',
    width: '100%', height: 1.5,
    background: filled ? 'var(--accent)' : 'var(--border)',
    zIndex: 0, opacity: filled ? 0.7 : 1,
  }),
  cefrLabelText: current => ({
    fontFamily: 'var(--font-mono)',
    fontSize: current ? 13 : 11, fontWeight: current ? 500 : 300,
    color: current ? 'var(--accent)' : 'var(--dim)',
    letterSpacing: '0.05em',
  }),

  twoCol: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 10, marginBottom: 12,
  },
  tagCloud: { display: 'flex', flexDirection: 'column', gap: 2 },
  tagGreen: {
    padding: '7px 12px',
    background: 'transparent',
    borderLeft: '3px solid var(--sage)',
    fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-mono)',
    fontWeight: 400,
  },
  tagBlue: {
    padding: '7px 12px',
    background: 'transparent',
    borderLeft: '3px solid var(--accent)',
    fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-mono)',
    fontWeight: 400,
  },

  resetRow: { display: 'flex', justifyContent: 'center', marginTop: 32 },
  resetBtn: {
    background: 'none', border: 'none',
    fontFamily: 'var(--font-mono)', fontSize: 12,
    color: 'var(--dim)', cursor: 'pointer',
    textDecoration: 'underline', textUnderlineOffset: 3,
    letterSpacing: '0.03em',
  },
}
