'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import { formatNumber } from '@/lib/utils'
import type { HolderPoint } from '@/types'

interface HolderTrendChartProps {
  holderHistory: HolderPoint[]
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null
  const data = payload[0].payload
  return (
    <div className="bg-bg-panel border border-border rounded px-3 py-2 shadow-lg">
      <p className="text-text-dim font-mono text-[10px]">
        {data.timestamp
          ? new Date(data.timestamp).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '—'}
      </p>
      <p className="text-neon-blue font-mono text-xs font-semibold">
        {formatNumber(data.count)} holders
      </p>
    </div>
  )
}

export function HolderTrendChart({ holderHistory }: HolderTrendChartProps) {
  if (!holderHistory || holderHistory.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-text-dim font-mono text-sm">
        No holder trend data
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={holderHistory} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a2744" vertical={false} />
        <XAxis
          dataKey="timestamp"
          tickFormatter={(v: string) =>
            new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          }
          tick={{ fill: '#4a5f8a', fontSize: 10, fontFamily: 'monospace' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => formatNumber(v)}
          tick={{ fill: '#4a5f8a', fontSize: 10, fontFamily: 'monospace' }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip content={<ChartTooltip />} />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#00ccff"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, fill: '#00ccff' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
