const styles = {
  wrapper: (speaker) => ({
    display: 'flex',
    justifyContent: speaker === 'user' ? 'flex-end' : 'flex-start',
    marginBottom: 12,
  }),
  bubble: (speaker) => ({
    maxWidth: '72%',
    padding: '12px 16px',
    borderRadius: speaker === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
    background: speaker === 'user'
      ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
      : '#1e293b',
    color: '#e2e8f0',
    fontSize: 15,
    lineHeight: 1.5,
    border: speaker === 'tutor' ? '1px solid #334155' : 'none',
  }),
  label: (speaker) => ({
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
    textAlign: speaker === 'user' ? 'right' : 'left',
  }),
  translation: {
    marginTop: 8,
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
  },
  playRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  playBtn: {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: 16,
    padding: '2px 4px',
    lineHeight: 1,
  },
  spinner: {
    color: '#64748b',
    fontSize: 13,
  },
}

export default function ChatBubble({ speaker, text, translation, audioLoading, onPlay }) {
  return (
    <div style={styles.wrapper(speaker)}>
      <div>
        <div style={styles.label(speaker)}>
          {speaker === 'user' ? 'You' : 'AI Tutor'}
        </div>
        <div style={styles.bubble(speaker)}>
          {text}
          {translation && (
            <div style={styles.translation}>{translation}</div>
          )}
          {speaker === 'tutor' && (
            <div style={styles.playRow}>
              {audioLoading ? (
                <span style={styles.spinner}>…</span>
              ) : onPlay ? (
                <button style={styles.playBtn} onClick={onPlay} title="Play audio">▶</button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
