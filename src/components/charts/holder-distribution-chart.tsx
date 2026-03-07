'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatNumber } from '@/lib/utils'
import type { HolderBucket } from '@/types'

interface HolderDistributionChartProps {
  distribution: HolderBucket[]
  totalHolders?: number
}

const COLORS = ['#00ff88', '#00ccff', '#a855f7', '#ffd000', '#ff3366', '#22d3ee']

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null
  const data = payload[0].payload
  return (
    <div className="bg-bg-panel border border-border rounded px-3 py-2 shadow-lg">
      <p className="text-text-primary font-mono text-xs font-semibold">{data.range}</p>
      <p className="text-text-secondary font-mono text-[11px]">
        {formatNumber(data.count)} holders ({data.percentage.toFixed(1)}%)
      </p>
    </div>
  )
}

export function HolderDistributionChart({ distribution, totalHolders }: HolderDistributionChartProps) {
  if (!distribution || distribution.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-text-dim font-mono text-sm">
        No distribution data
      </div>
    )
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={distribution}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            dataKey="count"
            nameKey="range"
            stroke="none"
          >
            {distribution.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {/* Center label */}
      {totalHolders !== undefined && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-mono text-lg font-bold text-text-primary">
            {formatNumber(totalHolders)}
          </span>
          <span className="font-mono text-[10px] text-text-dim uppercase tracking-widest">
            Holders
          </span>
        </div>
      )}
    </div>
  )
}
