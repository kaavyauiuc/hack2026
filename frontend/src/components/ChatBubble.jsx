export default function ChatBubble({ speaker, text, translation, audioLoading, onPlay, onPause, isPlaying }) {
  const isUser = speaker === 'user'
  return (
    <div className={isUser ? 'msg-user' : 'msg-tutor'} style={s.wrapper(isUser)}>
      <div style={s.outer(isUser)}>
        <div style={s.label(isUser)}>{isUser ? 'you' : 'tutor'}</div>
        <div style={s.bubble(isUser)}>
          <span style={s.text(isUser)}>{text || <span style={s.cursor} />}</span>
          {translation && (
            <div style={s.translation}>{translation}</div>
          )}
          {!isUser && (
            <div style={s.playRow}>
              {audioLoading
                ? <span style={s.loadingDots}>
                    <span style={s.dot}>·</span>
                    <span style={{...s.dot, animationDelay: '0.18s'}}>·</span>
                    <span style={{...s.dot, animationDelay: '0.36s'}}>·</span>
                  </span>
                : isPlaying
                  ? <button style={s.playBtn} onClick={onPause} title="Pause audio">‖</button>
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
    marginBottom: 18,
    padding: '0 4px',
  }),
  outer: () => ({
    maxWidth: '72%',
    minWidth: 48,
  }),
  label: isUser => ({
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    letterSpacing: '0.18em',
    textTransform: 'lowercase',
    color: 'var(--dim)',
    marginBottom: 5,
    textAlign: isUser ? 'right' : 'left',
  }),
  bubble: isUser => ({
    padding: '13px 16px',
    borderRadius: isUser ? '12px 12px 3px 12px' : '3px 12px 12px 12px',
    background: isUser ? 'var(--surface-2)' : 'rgba(15, 82, 160, 0.055)',
    border: `1px solid ${isUser ? 'var(--border-subtle)' : 'rgba(15,82,160,0.15)'}`,
    borderLeft: isUser ? undefined : '2.5px solid var(--accent)',
    color: 'var(--text)',
    lineHeight: 1.7,
    position: 'relative',
  }),
  text: isUser => ({
    fontFamily: isUser ? 'var(--font-mono)' : 'var(--font-display)',
    fontSize: isUser ? 12 : 15,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    display: 'block',
  }),
  cursor: {
    display: 'inline-block',
    width: 7,
    height: 15,
    background: 'var(--accent)',
    borderRadius: 1,
    verticalAlign: 'text-bottom',
    animation: 'blink 1.1s step-end infinite',
    opacity: 0.7,
  },
  translation: {
    marginTop: 10,
    paddingTop: 10,
    borderTop: '1px solid var(--border-subtle)',
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    fontStyle: 'normal',
    color: 'var(--muted)',
    fontWeight: 300,
    letterSpacing: '0.02em',
    lineHeight: 1.65,
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
    fontSize: 11,
    padding: '0 2px',
    lineHeight: 1,
    opacity: 0.65,
    transition: 'opacity 0.15s',
    fontFamily: 'var(--font-mono)',
  },
  loadingDots: {
    display: 'flex',
    gap: 3,
    alignItems: 'center',
  },
  dot: {
    fontFamily: 'var(--font-mono)',
    fontSize: 20,
    color: 'var(--accent)',
    opacity: 0.5,
    animation: 'blink 1s ease-in-out infinite',
    lineHeight: 1,
  },
}
