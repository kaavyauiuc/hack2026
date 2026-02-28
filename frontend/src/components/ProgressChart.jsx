import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const CEFR_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const cefrToNum = level => { const i = CEFR_ORDER.indexOf(level); return i >= 0 ? i + 1 : 1 }
const numToCefr = num => CEFR_ORDER[Math.round(num) - 1] || 'A1'

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1a1510',
      border: '1px solid #312718',
      borderRadius: 8,
      padding: '9px 13px',
      fontFamily: 'Overpass Mono, monospace',
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#d4702a', fontFamily: 'Fraunces, Georgia, serif' }}>
        {numToCefr(payload[0].value)}
      </div>
      <div style={{ fontSize: 11, color: '#8c7b68', marginTop: 2 }}>
        {payload[0].payload.date}
      </div>
    </div>
  )
}

export default function ProgressChart({ history }) {
  if (!history || history.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        color: 'var(--muted)',
        padding: '28px 16px',
        fontSize: 12,
        fontFamily: 'Overpass Mono, monospace',
      }}>
        Complete a session to see your CEFR progress.
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
      <LineChart data={data} margin={{ top: 6, right: 12, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="#261f18" />
        <XAxis
          dataKey="session"
          stroke="#312718"
          tick={{ fontSize: 11, fill: '#54473c', fontFamily: 'Overpass Mono, monospace' }}
          tickLine={false}
          axisLine={{ stroke: '#312718' }}
        />
        <YAxis
          domain={[1, 6]}
          ticks={[1, 2, 3, 4, 5, 6]}
          tickFormatter={numToCefr}
          stroke="#312718"
          tick={{ fontSize: 11, fill: '#54473c', fontFamily: 'Overpass Mono, monospace' }}
          tickLine={false}
          axisLine={{ stroke: '#312718' }}
          width={28}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#312718', strokeWidth: 1 }} />
        <Line
          type="monotone"
          dataKey="level"
          stroke="#d4702a"
          strokeWidth={2}
          dot={{ fill: '#d4702a', r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6, fill: '#e07b35', strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
