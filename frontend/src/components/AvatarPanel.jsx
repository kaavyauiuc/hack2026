import { useEffect, useRef, useState } from 'react'

// Static avatar image — same portrait SadTalker animates from.
const AVATAR_IMG =
  'https://raw.githubusercontent.com/OpenTalker/SadTalker/main/examples/source_image/art_0.png'

/**
 * AvatarPanel
 * Props:
 *   videoUrl   — blob: URL of the latest MP4, or null when idle
 *   videoKey   — increment to force replay of the same URL
 *   isLoading  — true while video is being generated
 */
export default function AvatarPanel({ videoUrl, videoKey, isLoading }) {
  const videoRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!videoUrl || !videoRef.current) return
    const v = videoRef.current
    v.load()
    v.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
  }, [videoUrl, videoKey])

  return (
    <div style={s.panel}>
      <div style={s.screen}>
        {/* Static avatar always visible underneath */}
        <img
          src={AVATAR_IMG}
          alt="tutor avatar"
          style={{ ...s.avatarImg, opacity: playing ? 0 : 1 }}
          draggable={false}
        />

        {/* Video overlaid when playing */}
        {videoUrl && (
          <video
            ref={videoRef}
            src={videoUrl}
            style={{ ...s.video, opacity: playing ? 1 : 0 }}
            onEnded={() => setPlaying(false)}
            playsInline
          />
        )}

        {/* Loading overlay */}
        {isLoading && !playing && (
          <div style={s.loadingOverlay}>
            <span className="spinner" style={{ width: 18, height: 18 }} />
          </div>
        )}

        {/* Live badge */}
        {playing && (
          <div style={s.liveBadge}>
            <span style={s.liveDot} />
            live
          </div>
        )}
      </div>

      <div style={s.label}>tutor</div>
    </div>
  )
}

const s = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    width: 200,
  },
  screen: {
    position: 'relative',
    width: 200,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  avatarImg: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'opacity 0.3s',
  },
  video: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'opacity 0.3s',
  },
  loadingOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(248,246,241,0.55)',
    backdropFilter: 'blur(3px)',
  },
  liveBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    background: 'rgba(20,18,16,0.55)',
    backdropFilter: 'blur(6px)',
    borderRadius: 20,
    padding: '3px 9px',
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    letterSpacing: '0.12em',
    color: '#fff',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#e04444',
    animation: 'blink 1.2s ease-in-out infinite',
    flexShrink: 0,
  },
  label: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    letterSpacing: '0.18em',
    textTransform: 'lowercase',
    color: 'var(--dim)',
  },
}
