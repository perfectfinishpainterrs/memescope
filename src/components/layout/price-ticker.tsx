'use client'

import { useEffect, useRef, useState } from 'react'

interface CoinPrice {
  id: string
  symbol: string
  price: number
  change24h: number
  loading: boolean
}

const COINS = [
  { id: 'bitcoin', symbol: 'BTC' },
  { id: 'ethereum', symbol: 'ETH' },
  { id: 'solana', symbol: 'SOL' },
]

function formatPrice(price: number): string {
  if (price >= 1000) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (price >= 1) return '$' + price.toFixed(2)
  return '$' + price.toFixed(4)
}

export function PriceTicker() {
  const [coins, setCoins] = useState<CoinPrice[]>(
    COINS.map((c) => ({ ...c, price: 0, change24h: 0, loading: true }))
  )
  const prevRef = useRef<Record<string, number>>({})
  const [flash, setFlash] = useState<Record<string, 'up' | 'down' | null>>({})

  useEffect(() => {
    let mounted = true

    const fetchPrices = async () => {
      try {
        const ids = COINS.map((c) => c.id).join(',')
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
          { cache: 'no-store' }
        )
        if (!res.ok || !mounted) return
        const data = await res.json()

        const updated: CoinPrice[] = COINS.map((c) => {
          const d = data[c.id]
          return {
            id: c.id,
            symbol: c.symbol,
            price: d?.usd || 0,
            change24h: d?.usd_24h_change || 0,
            loading: false,
          }
        })

        // Flash on price change
        const newFlash: Record<string, 'up' | 'down' | null> = {}
        for (const coin of updated) {
          const prev = prevRef.current[coin.id]
          if (prev && prev !== coin.price) {
            newFlash[coin.id] = coin.price > prev ? 'up' : 'down'
          }
          prevRef.current[coin.id] = coin.price
        }
        if (Object.keys(newFlash).length > 0) {
          setFlash(newFlash)
          setTimeout(() => { if (mounted) setFlash({}) }, 800)
        }

        setCoins(updated)
      } catch {
        // silently retry next interval
      }
    }

    fetchPrices()
    const interval = setInterval(fetchPrices, 30_000)
    return () => { mounted = false; clearInterval(interval) }
  }, [])

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-bg-deep/95 backdrop-blur-md">
      <div className="flex items-center justify-center gap-8 px-4 py-1.5">
        {coins.map((coin) => {
          const isUp = coin.change24h >= 0
          const color = isUp ? 'text-neon-green' : 'text-neon-red'
          const flashClass =
            flash[coin.id] === 'up'
              ? 'animate-flash-green'
              : flash[coin.id] === 'down'
                ? 'animate-flash-red'
                : ''

          return (
            <div
              key={coin.id}
              className={`flex items-center gap-2.5 font-mono text-xs ${flashClass}`}
            >
              <span className="text-text-dim tracking-wider text-[10px]">
                {coin.symbol}
              </span>
              <span className={`font-medium ${color} transition-colors duration-300`}>
                {coin.loading ? '—' : formatPrice(coin.price)}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  isUp
                    ? 'bg-neon-green/10 text-neon-green'
                    : 'bg-neon-red/10 text-neon-red'
                }`}
              >
                {coin.loading ? '—' : `${isUp ? '▲' : '▼'} ${Math.abs(coin.change24h).toFixed(1)}%`}
              </span>
            </div>
          )
        })}
        <div className="flex items-center gap-1 ml-2">
          <div className="w-1 h-1 rounded-full bg-neon-green shadow-[0_0_6px_#00ff88] animate-pulse-dot" />
        </div>
      </div>
    </div>
  )
}
