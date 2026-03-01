import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useTheme } from '../theme.js'

const CEFR_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const cefrToNum = level => { const i = CEFR_ORDER.indexOf(level); return i >= 0 ? i + 1 : 1 }
const numToCefr = num => CEFR_ORDER[Math.round(num) - 1] || 'A1'

const PALETTES = {
  phosphene: {
    accent:       '#0F52A0',
    accentHover:  '#1460B8',
    grid:         '#E5E2DA',
    tick:         '#A8A49B',
    axis:         '#D5D0C6',
    tooltipBg:    '#FFFFFF',
    tooltipBorder:'#D5D0C6',
    tooltipMuted: '#6B6760',
    tooltipAccent:'#0F52A0',
  },
  atelier: {
    accent:       '#d4702a',
    accentHover:  '#e07b35',
    grid:         '#261f18',
    tick:         '#54473c',
    axis:         '#312718',
    tooltipBg:    '#1a1510',
    tooltipBorder:'#312718',
    tooltipMuted: '#8c7b68',
    tooltipAccent:'#d4702a',
  },
}

function CustomTooltip({ active, payload, palette }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: palette.tooltipBg,
      border: `1px solid ${palette.tooltipBorder}`,
      borderRadius: 8,
      padding: '9px 13px',
      fontFamily: 'var(--font-mono)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    }}>
      <div style={{
        fontSize: 18, fontWeight: 400,
        color: palette.tooltipAccent,
        fontFamily: 'var(--font-display)',
      }}>
        {numToCefr(payload[0].value)}
      </div>
      <div style={{ fontSize: 10, color: palette.tooltipMuted, marginTop: 2, letterSpacing: '0.04em' }}>
        {payload[0].payload.date}
      </div>
    </div>
  )
}

export default function ProgressChart({ history }) {
  const theme = useTheme()
  const p = PALETTES[theme] ?? PALETTES.phosphene

  if (!history || history.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        color: 'var(--dim)',
        padding: '28px 16px',
        fontSize: 11,
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.04em',
      }}>
        complete a session to see your cefr progress
      </div>
    )
  }

  const data = history.map((s, i) => ({
    session: `S${i + 1}`,
    date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    level: cefrToNum(s.cefr_estimate),
    cefr: s.cefr_estimate,
  }))

  return (
    <ResponsiveContainer width="100%" height={190}>
      <LineChart data={data} margin={{ top: 8, right: 14, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 6" stroke={p.grid} />
        <XAxis
          dataKey="session"
          stroke={p.axis}
          tick={{ fontSize: 10, fill: p.tick, fontFamily: 'var(--font-mono)' }}
          tickLine={false}
          axisLine={{ stroke: p.axis }}
        />
        <YAxis
          domain={[1, 6]}
          ticks={[1, 2, 3, 4, 5, 6]}
          tickFormatter={numToCefr}
          stroke={p.axis}
          tick={{ fontSize: 10, fill: p.tick, fontFamily: 'var(--font-mono)' }}
          tickLine={false}
          axisLine={{ stroke: p.axis }}
          width={30}
        />
        <Tooltip
          content={<CustomTooltip palette={p} />}
          cursor={{ stroke: p.axis, strokeWidth: 1 }}
        />
        <Line
          type="monotone"
          dataKey="level"
          stroke={p.accent}
          strokeWidth={2}
          dot={{ fill: p.accent, r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6, fill: p.accentHover, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
