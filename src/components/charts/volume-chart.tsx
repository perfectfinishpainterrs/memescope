'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatUsd } from '@/lib/utils'
import type { VolumePoint } from '@/types'

interface VolumeChartProps {
  volumeHistory: VolumePoint[]
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null
  const data = payload[0].payload
  const total = (data.buyVolume || 0) + (data.sellVolume || 0)
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
      <p className="text-text-primary font-mono text-xs font-semibold">
        {formatUsd(total)}
      </p>
      <div className="flex gap-3 mt-0.5">
        <span className="text-neon-green font-mono text-[10px]">Buy {formatUsd(data.buyVolume || 0)}</span>
        <span className="text-neon-red font-mono text-[10px]">Sell {formatUsd(data.sellVolume || 0)}</span>
      </div>
    </div>
  )
}

export function VolumeChart({ volumeHistory }: VolumeChartProps) {
  if (!volumeHistory || volumeHistory.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-text-dim font-mono text-sm">
        No volume data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={volumeHistory} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <XAxis
          dataKey="timestamp"
          tickFormatter={(v: string) =>
            new Date(v).toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            })
          }
          tick={{ fill: '#3a4d70', fontSize: 10, fontFamily: 'monospace' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => formatUsd(v)}
          tick={{ fill: '#3a4d70', fontSize: 10, fontFamily: 'monospace' }}
          axisLine={false}
          tickLine={false}
          width={60}
        />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="buyVolume" stackId="vol" fill="#00ff88" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
        <Bar dataKey="sellVolume" stackId="vol" fill="#ff3366" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
