import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatDateLabel } from '../utils'
import type { Phase } from '../types'

interface ChartPoint {
  date: string
  weight: number | null
  weeklyAvg: number | null
}

interface WeightChartProps {
  data: ChartPoint[]
  unit: string
  phase: Phase
}

export function WeightChart({ data, unit, phase }: WeightChartProps) {
  const accent = phase === 'bulking' ? '#f59e0b' : '#3b82f6'

  if (data.length === 0) {
    return (
      <div className="chart-empty">
        <p>Log a few weights to see your trend chart.</p>
      </div>
    )
  }

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateLabel}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            stroke="var(--border)"
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            stroke="var(--border)"
            tickFormatter={(v) => `${v}`}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text)',
            }}
            labelFormatter={(label) => formatDateLabel(String(label))}
            formatter={(value, name) => [
              value != null && value !== '' ? `${value} ${unit}` : '—',
              name === 'weight' ? 'Daily' : 'Weekly avg',
            ]}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="weight"
            name="Daily weight"
            stroke={accent}
            strokeWidth={2}
            dot={{ r: 4, fill: accent }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="weeklyAvg"
            name="Weekly average"
            stroke="var(--text)"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={{ r: 3 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
