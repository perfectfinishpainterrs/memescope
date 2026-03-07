'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import { formatNumber } from '@/lib/utils'
import type { HolderFlowPoint } from '@/types'

interface HolderFlowChartProps {
  holderFlow: HolderFlowPoint[]
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  return (
    <div className="bg-bg-panel border border-border rounded px-3 py-2 shadow-lg">
      <p className="text-text-dim font-mono text-[10px]">
        {data.timestamp
          ? new Date(data.timestamp).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })
          : '—'}
      </p>
      <p className="text-neon-green font-mono text-xs">
        In: +{formatNumber(data.inflow)}
      </p>
      <p className="text-neon-red font-mono text-xs">
        Out: -{formatNumber(data.outflow)}
      </p>
    </div>
  )
}

export function HolderFlowChart({ holderFlow }: HolderFlowChartProps) {
  if (!holderFlow || holderFlow.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-text-dim font-mono text-sm">
        No holder flow data
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={holderFlow} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
        <Bar dataKey="inflow" fill="#00ff88" radius={[2, 2, 0, 0]} />
        <Bar dataKey="outflow" fill="#ff3366" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
