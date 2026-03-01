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
      background: '#FFFFFF',
      border: '1px solid #D5D0C6',
      borderRadius: 8,
      padding: '9px 13px',
      fontFamily: 'Martian Mono, monospace',
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    }}>
      <div style={{ fontSize: 16, fontWeight: 400, color: '#0F52A0', fontFamily: 'Instrument Serif, Georgia, serif' }}>
        {numToCefr(payload[0].value)}
      </div>
      <div style={{ fontSize: 10, color: '#6B6760', marginTop: 2, letterSpacing: '0.04em' }}>
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
        color: 'var(--dim)',
        padding: '28px 16px',
        fontSize: 11,
        fontFamily: 'Martian Mono, monospace',
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
        <CartesianGrid strokeDasharray="3 6" stroke="#E5E2DA" />
        <XAxis
          dataKey="session"
          stroke="#D5D0C6"
          tick={{ fontSize: 10, fill: '#A8A49B', fontFamily: 'Martian Mono, monospace' }}
          tickLine={false}
          axisLine={{ stroke: '#D5D0C6' }}
        />
        <YAxis
          domain={[1, 6]}
          ticks={[1, 2, 3, 4, 5, 6]}
          tickFormatter={numToCefr}
          stroke="#D5D0C6"
          tick={{ fontSize: 10, fill: '#A8A49B', fontFamily: 'Martian Mono, monospace' }}
          tickLine={false}
          axisLine={{ stroke: '#D5D0C6' }}
          width={30}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#D5D0C6', strokeWidth: 1 }} />
        <Line
          type="monotone"
          dataKey="level"
          stroke="#0F52A0"
          strokeWidth={2}
          dot={{ fill: '#0F52A0', r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6, fill: '#1460B8', strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
