export default function ChatBubble({ speaker, text, translation, audioLoading, onPlay }) {
  const isUser = speaker === 'user'
  return (
    <div className={isUser ? 'msg-user' : 'msg-tutor'} style={s.wrapper(isUser)}>
      <div style={s.outer(isUser)}>
        <div style={s.label(isUser)}>{isUser ? 'You' : 'Tutor'}</div>
        <div style={s.bubble(isUser)}>
          <span style={s.text}>{text || <span style={s.cursor} />}</span>
          {translation && (
            <div style={s.translation}>{translation}</div>
          )}
          {!isUser && (
            <div style={s.playRow}>
              {audioLoading
                ? <span style={s.loadingDots}><span>·</span><span>·</span><span>·</span></span>
                : onPlay
                  ? <button style={s.playBtn} onClick={onPlay} title="Play audio">▶</button>
                  : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const s = {
  wrapper: isUser => ({
    display: 'flex',
    justifyContent: isUser ? 'flex-end' : 'flex-start',
    marginBottom: 16,
    padding: '0 4px',
  }),
  outer: isUser => ({
    maxWidth: '75%',
    minWidth: 48,
  }),
  label: isUser => ({
    fontFamily: 'Overpass Mono, monospace',
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--dim)',
    marginBottom: 5,
    textAlign: isUser ? 'right' : 'left',
  }),
  bubble: isUser => ({
    padding: '12px 15px',
    borderRadius: isUser ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
    background: isUser ? 'var(--surface-3)' : 'var(--surface)',
    border: isUser ? '1px solid var(--border)' : 'none',
    borderLeft: isUser ? undefined : '2px solid var(--accent)',
    color: 'var(--text)',
    lineHeight: 1.65,
    fontFamily: 'Overpass Mono, monospace',
    fontSize: 13.5,
    position: 'relative',
  }),
  text: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  cursor: {
    display: 'inline-block',
    width: 8,
    height: 14,
    background: 'var(--accent)',
    borderRadius: 1,
    verticalAlign: 'text-bottom',
    animation: 'blink 1s step-end infinite',
  },
  translation: {
    marginTop: 9,
    paddingTop: 9,
    borderTop: '1px solid var(--border-subtle)',
    fontFamily: 'Fraunces, Georgia, serif',
    fontStyle: 'italic',
    fontSize: 13,
    color: 'var(--muted)',
    fontWeight: 300,
  },
  playRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: 8,
    minHeight: 18,
  },
  playBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--accent)',
    cursor: 'pointer',
    fontSize: 13,
    padding: '0 2px',
    lineHeight: 1,
    opacity: 0.8,
    transition: 'opacity 0.15s',
  },
  loadingDots: {
    fontFamily: 'Overpass Mono, monospace',
    fontSize: 16,
    color: 'var(--muted)',
    letterSpacing: 2,
  },
}
