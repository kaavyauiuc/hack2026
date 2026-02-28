import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const CEFR_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

function cefrToNum(level) {
  const idx = CEFR_ORDER.indexOf(level)
  return idx >= 0 ? idx + 1 : 1
}

function numToCefr(num) {
  return CEFR_ORDER[Math.round(num) - 1] || 'A1'
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 13,
      }}>
        <p style={{ color: '#6366f1', fontWeight: 600 }}>
          CEFR: {numToCefr(payload[0].value)}
        </p>
        <p style={{ color: '#94a3b8' }}>{payload[0].payload.date}</p>
      </div>
    )
  }
  return null
}

export default function ProgressChart({ history }) {
  if (!history || history.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#64748b', padding: 32 }}>
        Complete a session to see your CEFR progress chart.
      </div>
    )
  }

  const data = history.map((s, i) => ({
    session: `S${i + 1}`,
    date: new Date(s.date).toLocaleDateString(),
    level: cefrToNum(s.cefr_estimate),
    cefr: s.cefr_estimate,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="session" stroke="#475569" tick={{ fontSize: 12 }} />
        <YAxis
          domain={[1, 6]}
          ticks={[1, 2, 3, 4, 5, 6]}
          tickFormatter={numToCefr}
          stroke="#475569"
          tick={{ fontSize: 12 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="level"
          stroke="#6366f1"
          strokeWidth={2}
          dot={{ fill: '#6366f1', r: 5 }}
          activeDot={{ r: 7 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
