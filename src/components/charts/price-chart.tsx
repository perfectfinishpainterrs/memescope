'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import { Tabs } from '@/components/ui/tabs'
import { formatPrice, formatUsd } from '@/lib/utils'
import type { PricePoint } from '@/types'

interface PriceChartProps {
  priceHistory: PricePoint[]
  onTimeframeChange: (tf: string) => void
  activeTimeframe: string
}

const timeframeTabs = [
  { id: '1H', label: '1H' },
  { id: '4H', label: '4H' },
  { id: '1D', label: '1D' },
  { id: '1W', label: '1W' },
]

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
      <p className="text-neon-green font-mono text-xs font-semibold">
        ${formatPrice(data.price ?? 0)}
      </p>
    </div>
  )
}

export function PriceChart({ priceHistory, onTimeframeChange, activeTimeframe }: PriceChartProps) {
  const isUptrend = useMemo(() => {
    if (priceHistory.length < 2) return true
    return priceHistory[priceHistory.length - 1].price >= priceHistory[0].price
  }, [priceHistory])

  const strokeColor = isUptrend ? '#00ff88' : '#ff3366'
  const gradientId = 'priceChartGradient'

  return (
    <div className="space-y-3">
      <Tabs tabs={timeframeTabs} activeTab={activeTimeframe} onTabChange={onTimeframeChange} />

      {priceHistory.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={priceHistory} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.2} />
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2744" vertical={false} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(v: string) =>
                new Date(v).toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              }
              tick={{ fill: '#4a5f8a', fontSize: 10, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={['auto', 'auto']}
              tickFormatter={(v: number) => `$${formatPrice(v)}`}
              tick={{ fill: '#4a5f8a', fontSize: 10, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
              width={72}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="price"
              stroke={strokeColor}
              strokeWidth={1.5}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 3, fill: strokeColor }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[300px] text-text-dim font-mono text-sm">
          No price data available
        </div>
      )}
    </div>
  )
}
