'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend,
} from 'recharts'
import { Header } from '@/components/layout/header'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { GlitchText } from '@/components/effects/glitch-text'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Brain,
  RefreshCw,
  Zap,
  Target,
  BarChart3,
  PieChart as PieIcon,
  Activity,
  Crosshair,
  Shield,
} from 'lucide-react'
import {
  formatUsd,
  formatPrice,
  formatPct,
  formatNumber,
  shortenAddress,
  cn,
} from '@/lib/utils'
import Link from 'next/link'

interface Holding {
  mint: string
  name: string
  symbol: string
  amount: number
  usdValue: number
  price: number
  priceChange24h: number
  logo: string | null
}

interface Transaction {
  hash: string
  timestamp: string
  type: 'BUY' | 'SELL'
  tokenAddress: string
  tokenSymbol: string
  tokenName: string
  tokenAmount: number
  quoteSymbol: string
  quoteAmount: number
  usdValue: number
}

interface PortfolioData {
  wallet: string
  solBalance: number
  solPrice: number
  solValue: number
  totalValue: number
  holdingCount: number
  holdings: Holding[]
}

interface TradeAnalysis {
  timestamp: string
  portfolioGrade: string
  pnlAnalysis: string
  tradingPatterns: string
  riskAssessment: string
  recommendations: string
  traderScore: string
}

const NEON_COLORS = ['#00ff88', '#00e5ff', '#ff00aa', '#ff3366', '#00ccff', '#ffd000', '#aa00ff', '#ff6600']

function CyberTooltip({ active, payload, label }: any) {
  if (!active || !payload?.[0]) return null
  return (
    <div className="bg-[#070d18]/95 border border-neon-green/30 rounded px-3 py-2 shadow-[0_0_15px_rgba(0,255,136,0.15)] backdrop-blur-sm">
      <p className="text-text-dim font-mono text-[9px] uppercase tracking-widest">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-mono text-xs font-semibold" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? (p.value < 1 ? p.value.toFixed(4) : formatUsd(p.value)) : p.value}
        </p>
      ))}
    </div>
  )
}

export default function PortfolioPage() {
  const { publicKey, connected } = useWallet()
  const { setVisible } = useWalletModal()
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [analysis, setAnalysis] = useState<TradeAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [txLoading, setTxLoading] = useState(false)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [tokenAdvice, setTokenAdvice] = useState<Record<string, string>>({})
  const [tokenAdviceLoading, setTokenAdviceLoading] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState<'holdings' | 'trades' | 'charts'>('holdings')

  const walletAddress = publicKey?.toBase58() || null

  const fetchPortfolio = useCallback(async () => {
    if (!walletAddress) return
    setLoading(true)
    try {
      const res = await fetch(`/api/portfolio?wallet=${walletAddress}`)
      if (res.ok) setPortfolio(await res.json())
    } catch {}
    setLoading(false)
  }, [walletAddress])

  const fetchTransactions = useCallback(async () => {
    if (!walletAddress) return
    setTxLoading(true)
    try {
      const res = await fetch(`/api/portfolio/transactions?wallet=${walletAddress}`)
      if (res.ok) {
        const data = await res.json()
        setTransactions(data.transactions || [])
      }
    } catch {}
    setTxLoading(false)
  }, [walletAddress])

  useEffect(() => {
    if (walletAddress) {
      fetchPortfolio()
      fetchTransactions()
    } else {
      setPortfolio(null)
      setTransactions([])
      setAnalysis(null)
    }
  }, [walletAddress, fetchPortfolio, fetchTransactions])

  // Auto-trigger AI analysis
  useEffect(() => {
    if (!portfolio || transactions.length === 0 || analysis || analysisLoading) return
    runAnalysis()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolio, transactions])

  const runAnalysis = async () => {
    if (!portfolio) return
    setAnalysisLoading(true)
    try {
      const res = await fetch('/api/portfolio/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holdings: portfolio.holdings,
          transactions,
          solBalance: portfolio.solBalance,
          solValue: portfolio.solValue,
          totalValue: portfolio.totalValue,
        }),
      })
      if (res.ok) setAnalysis(await res.json())
    } catch {}
    setAnalysisLoading(false)
  }

  // Ask AI about a specific token
  const askAboutToken = async (holding: Holding) => {
    const key = holding.mint
    setTokenAdviceLoading((p) => ({ ...p, [key]: true }))
    try {
      const res = await fetch('/api/token/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: holding.mint,
          chain: 'SOL',
          name: holding.name,
          ticker: holding.symbol,
          price: holding.price,
          priceChange24h: holding.priceChange24h,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setTokenAdvice((p) => ({ ...p, [key]: data.verdict || data.overview || 'No verdict available' }))
      }
    } catch {}
    setTokenAdviceLoading((p) => ({ ...p, [key]: false }))
  }

  // ── Chart data builders ──

  // Allocation pie chart
  const allocationData = useMemo(() => {
    if (!portfolio?.holdings?.length) return []
    const top = portfolio.holdings.slice(0, 7)
    const rest = portfolio.holdings.slice(7)
    const restValue = rest.reduce((s, h) => s + h.usdValue, 0)
    const data = top.map((h) => ({ name: h.symbol, value: h.usdValue }))
    if (restValue > 0) data.push({ name: 'Other', value: restValue })
    // Add SOL
    if (portfolio.solValue > 0) data.unshift({ name: 'SOL', value: portfolio.solValue })
    return data
  }, [portfolio])

  // Trade volume by day
  const tradeVolumeData = useMemo(() => {
    if (!transactions.length) return []
    const dayMap = new Map<string, { buys: number; sells: number }>()
    transactions.forEach((tx) => {
      const day = new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      if (!dayMap.has(day)) dayMap.set(day, { buys: 0, sells: 0 })
      const d = dayMap.get(day)!
      if (tx.type === 'BUY') d.buys += tx.usdValue || tx.quoteAmount
      else d.sells += tx.usdValue || tx.quoteAmount
    })
    return [...dayMap.entries()].reverse().map(([day, d]) => ({
      day,
      Buys: Number(d.buys.toFixed(2)),
      Sells: Number(d.sells.toFixed(2)),
    }))
  }, [transactions])

  // PnL by token
  const pnlByToken = useMemo(() => {
    if (!transactions.length) return []
    const tokenMap = new Map<string, { symbol: string; spent: number; received: number }>()
    transactions.forEach((tx) => {
      const key = tx.tokenSymbol || tx.tokenAddress
      if (!tokenMap.has(key)) tokenMap.set(key, { symbol: tx.tokenSymbol, spent: 0, received: 0 })
      const t = tokenMap.get(key)!
      if (tx.type === 'BUY') t.spent += tx.usdValue || 0
      else t.received += tx.usdValue || 0
    })
    return [...tokenMap.values()]
      .map((t) => ({ symbol: t.symbol, pnl: Number((t.received - t.spent).toFixed(2)) }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 10)
  }, [transactions])

  // Trade frequency over time
  const tradeFreqData = useMemo(() => {
    if (!transactions.length) return []
    const dayMap = new Map<string, number>()
    transactions.forEach((tx) => {
      const day = new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      dayMap.set(day, (dayMap.get(day) || 0) + 1)
    })
    return [...dayMap.entries()].reverse().map(([day, count]) => ({ day, trades: count }))
  }, [transactions])

  // Buy/sell ratio
  const buyCount = transactions.filter((t) => t.type === 'BUY').length
  const sellCount = transactions.filter((t) => t.type === 'SELL').length
  const totalPnl = pnlByToken.reduce((s, t) => s + t.pnl, 0)

  // Not connected
  if (!connected || !walletAddress) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="max-w-[1440px] mx-auto px-7 py-16">
          <div className="flex flex-col items-center justify-center gap-8 py-20">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-neon-green/10 to-neon-cyan/10 border border-neon-green/20 flex items-center justify-center shadow-[0_0_40px_rgba(0,255,136,0.1),0_0_80px_rgba(0,255,136,0.05)]">
                <Wallet className="w-12 h-12 text-neon-green drop-shadow-[0_0_8px_rgba(0,255,136,0.5)]" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-neon-red animate-pulse shadow-[0_0_10px_rgba(255,51,102,0.5)]" />
            </div>
            <div className="text-center">
              <GlitchText text="CONNECT WALLET" as="h1" className="text-3xl mb-3 bg-gradient-to-r from-neon-green to-neon-cyan bg-clip-text text-transparent" />
              <p className="text-text-dim font-mono text-sm max-w-md leading-relaxed">
                Link your Solflare or Phantom wallet to unlock portfolio tracking,
                PnL analysis, trade history, and AI-powered trade intelligence.
              </p>
            </div>
            <Button variant="cyber" size="lg" onClick={() => setVisible(true)}>
              <Zap className="w-4 h-4" />
              Initialize Connection
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-[1440px] mx-auto px-7 py-5 space-y-5">

        {/* ═══ PORTFOLIO HEADER ═══ */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-green/20 to-neon-cyan/20 border border-neon-green/20 flex items-center justify-center shadow-[0_0_15px_rgba(0,255,136,0.1)]">
              <Target className="w-5 h-5 text-neon-green" />
            </div>
            <div>
              <GlitchText text="PORTFOLIO" as="h1" className="text-xl bg-gradient-to-r from-neon-green to-neon-cyan bg-clip-text text-transparent" />
              <span className="text-text-dim font-mono text-[10px] tracking-widest">
                {shortenAddress(walletAddress, 6)}
              </span>
            </div>
          </div>
          <Button size="sm" variant="cyber" onClick={() => { fetchPortfolio(); fetchTransactions(); setAnalysis(null) }} disabled={loading}>
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Rescan
          </Button>
        </div>

        {/* ═══ STAT CARDS ROW ═══ */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            {
              label: 'Total Value',
              value: loading ? null : formatUsd(portfolio?.totalValue ?? 0),
              icon: Wallet,
              color: 'text-neon-green',
              glow: 'shadow-[0_0_20px_rgba(0,255,136,0.08)]',
            },
            {
              label: 'SOL Balance',
              value: loading ? null : `${(portfolio?.solBalance ?? 0).toFixed(3)} SOL`,
              sub: loading ? null : formatUsd(portfolio?.solValue ?? 0),
              icon: Activity,
              color: 'text-neon-cyan',
              glow: 'shadow-[0_0_20px_rgba(0,229,255,0.08)]',
            },
            {
              label: 'Positions',
              value: loading ? null : String(portfolio?.holdingCount ?? 0),
              icon: BarChart3,
              color: 'text-neon-blue',
              glow: '',
            },
            {
              label: 'Trades',
              value: txLoading ? null : `${buyCount}B / ${sellCount}S`,
              sub: `${transactions.length} total`,
              icon: Crosshair,
              color: 'text-neon-magenta',
              glow: '',
            },
            {
              label: 'Est. PnL',
              value: loading ? null : `${totalPnl >= 0 ? '+' : ''}${formatUsd(totalPnl)}`,
              icon: totalPnl >= 0 ? TrendingUp : TrendingDown,
              color: totalPnl >= 0 ? 'text-neon-green' : 'text-neon-red',
              glow: totalPnl >= 0 ? 'shadow-[0_0_20px_rgba(0,255,136,0.08)]' : 'shadow-[0_0_20px_rgba(255,51,102,0.08)]',
            },
          ].map((stat) => (
            <Card key={stat.label} className={cn('relative overflow-hidden', stat.glow)} glow>
              {stat.value === null ? (
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 mb-2">
                    <stat.icon className={cn('w-3.5 h-3.5', stat.color)} />
                    <span className="text-[9px] text-text-dim uppercase tracking-widest font-mono">{stat.label}</span>
                  </div>
                  <span className={cn('text-lg font-mono font-bold block', stat.color)}>{stat.value}</span>
                  {stat.sub && <span className="text-text-dim font-mono text-[10px]">{stat.sub}</span>}
                  {/* Corner accent */}
                  <div className={cn('absolute top-0 right-0 w-8 h-8 opacity-10', stat.color === 'text-neon-green' ? 'bg-neon-green' : stat.color === 'text-neon-red' ? 'bg-neon-red' : 'bg-neon-cyan')} style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />
                </>
              )}
            </Card>
          ))}
        </div>

        {/* ═══ CHARTS ROW ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Allocation Pie */}
          <Card glow>
            <div className="flex items-center gap-2 mb-3">
              <PieIcon className="w-3.5 h-3.5 text-neon-cyan" />
              <span className="text-[10px] text-text-dim uppercase tracking-widest font-mono font-semibold">
                Allocation
              </span>
            </div>
            {loading ? (
              <Skeleton className="h-[220px]" />
            ) : allocationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="#070d18"
                    strokeWidth={2}
                  >
                    {allocationData.map((_, i) => (
                      <Cell key={i} fill={NEON_COLORS[i % NEON_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CyberTooltip />} />
                  <Legend
                    formatter={(value: string) => <span className="text-text-secondary font-mono text-[10px]">{value}</span>}
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-text-dim font-mono text-sm">No data</div>
            )}
          </Card>

          {/* Trade Volume Bar Chart */}
          <Card glow>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-3.5 h-3.5 text-neon-green" />
              <span className="text-[10px] text-text-dim uppercase tracking-widest font-mono font-semibold">
                Trade Volume
              </span>
            </div>
            {txLoading ? (
              <Skeleton className="h-[220px]" />
            ) : tradeVolumeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={tradeVolumeData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2744" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: '#4a5f8a', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#4a5f8a', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => `$${v}`} />
                  <Tooltip content={<CyberTooltip />} />
                  <Bar dataKey="Buys" fill="#00ff88" radius={[2, 2, 0, 0]} opacity={0.8} />
                  <Bar dataKey="Sells" fill="#ff3366" radius={[2, 2, 0, 0]} opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-text-dim font-mono text-sm">No trades</div>
            )}
          </Card>

          {/* PnL by Token */}
          <Card glow>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-3.5 h-3.5 text-neon-green" />
              <span className="text-[10px] text-text-dim uppercase tracking-widest font-mono font-semibold">
                PnL by Token
              </span>
            </div>
            {txLoading ? (
              <Skeleton className="h-[220px]" />
            ) : pnlByToken.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={pnlByToken} layout="vertical" margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2744" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#4a5f8a', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <YAxis type="category" dataKey="symbol" tick={{ fill: '#c8d6e5', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip content={<CyberTooltip />} />
                  <Bar dataKey="pnl" radius={[0, 2, 2, 0]}>
                    {pnlByToken.map((entry, i) => (
                      <Cell key={i} fill={entry.pnl >= 0 ? '#00ff88' : '#ff3366'} opacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-text-dim font-mono text-sm">No PnL data</div>
            )}
          </Card>

          {/* Trade Activity */}
          <Card glow>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-3.5 h-3.5 text-neon-magenta" />
              <span className="text-[10px] text-text-dim uppercase tracking-widest font-mono font-semibold">
                Trade Activity
              </span>
            </div>
            {txLoading ? (
              <Skeleton className="h-[220px]" />
            ) : tradeFreqData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={tradeFreqData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="tradeFreqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff00aa" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#ff00aa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2744" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: '#4a5f8a', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#4a5f8a', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip content={<CyberTooltip />} />
                  <Area type="monotone" dataKey="trades" stroke="#ff00aa" strokeWidth={2} fill="url(#tradeFreqGrad)" dot={false} activeDot={{ r: 3, fill: '#ff00aa' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-text-dim font-mono text-sm">No data</div>
            )}
          </Card>
        </div>

        {/* ═══ TAB SWITCHER ═══ */}
        <div className="flex items-center gap-1 bg-[#070d18] border border-[#121e36] rounded-lg p-1 w-fit">
          {(['holdings', 'trades'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-1.5 text-xs font-mono uppercase tracking-widest transition-all rounded',
                activeTab === tab
                  ? 'bg-neon-green/10 text-neon-green border border-neon-green/30 shadow-[0_0_10px_rgba(0,255,136,0.1)]'
                  : 'text-text-dim hover:text-text-secondary'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ═══ HOLDINGS ═══ */}
        {activeTab === 'holdings' && (
          <Card glow>
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="w-3.5 h-3.5 text-neon-green" />
              <span className="text-[10px] text-text-dim uppercase tracking-widest font-mono font-semibold">
                Holdings
              </span>
              <span className="text-[9px] text-text-dim font-mono ml-auto">{portfolio?.holdings?.length || 0} tokens</span>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : portfolio?.holdings?.length ? (
              <div className="space-y-1">
                {/* Header */}
                <div className="grid grid-cols-[1fr_90px_90px_70px_100px] gap-2 px-3 py-1.5 text-[9px] text-text-dim uppercase tracking-widest font-mono border-b border-border">
                  <span>Token</span>
                  <span className="text-right">Value</span>
                  <span className="text-right">Price</span>
                  <span className="text-right">24h</span>
                  <span className="text-right">Action</span>
                </div>
                {portfolio.holdings.map((h) => (
                  <div key={h.mint} className="group">
                    <div className="grid grid-cols-[1fr_90px_90px_70px_100px] gap-2 items-center px-3 py-2.5 rounded-lg hover:bg-bg-card border border-transparent hover:border-neon-green/10 transition-all">
                      <Link href={`/token/${h.mint}?chain=SOL`} className="flex items-center gap-2.5 min-w-0">
                        {h.logo ? (
                          <img src={h.logo} alt="" className="w-8 h-8 rounded-full flex-shrink-0 ring-1 ring-border" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-bg-panel border border-border flex items-center justify-center text-[11px] font-mono font-bold text-neon-green flex-shrink-0">
                            {h.symbol?.charAt(0) || '?'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="text-xs font-mono font-bold text-text-primary block truncate">{h.symbol}</span>
                          <span className="text-[10px] font-mono text-text-dim block truncate">{formatNumber(h.amount)}</span>
                        </div>
                      </Link>
                      <span className="text-xs font-mono text-text-primary text-right font-semibold">{formatUsd(h.usdValue)}</span>
                      <span className="text-xs font-mono text-text-secondary text-right">${formatPrice(h.price)}</span>
                      <span className={cn('text-xs font-mono text-right font-bold', h.priceChange24h >= 0 ? 'text-neon-green' : 'text-neon-red')}>
                        {formatPct(h.priceChange24h)}
                      </span>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="cyber"
                          onClick={() => askAboutToken(h)}
                          disabled={tokenAdviceLoading[h.mint]}
                          className="!text-[9px] !px-2 !py-1"
                        >
                          {tokenAdviceLoading[h.mint] ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Zap className="w-3 h-3" />
                          )}
                          What do?
                        </Button>
                      </div>
                    </div>
                    {/* AI Advice dropdown */}
                    {tokenAdvice[h.mint] && (
                      <div className="mx-3 mb-2 px-3 py-2 bg-[#0c1424] border border-neon-green/15 rounded-lg animate-fade-in">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Brain className="w-3 h-3 text-neon-green" />
                          <span className="text-[9px] text-neon-green uppercase tracking-widest font-mono font-semibold">AI Verdict</span>
                        </div>
                        <p className="text-text-secondary font-mono text-[11px] leading-relaxed">{tokenAdvice[h.mint]}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-text-dim font-mono text-sm text-center py-8">
                <Wallet className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No token holdings found
              </div>
            )}
          </Card>
        )}

        {/* ═══ TRADES ═══ */}
        {activeTab === 'trades' && (
          <Card glow>
            <div className="flex items-center gap-2 mb-3">
              <Crosshair className="w-3.5 h-3.5 text-neon-magenta" />
              <span className="text-[10px] text-text-dim uppercase tracking-widest font-mono font-semibold">
                Recent Trades
              </span>
              <span className="text-[9px] text-text-dim font-mono ml-auto">{transactions.length} swaps</span>
            </div>
            {txLoading ? (
              <div className="space-y-2">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : transactions.length > 0 ? (
              <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
                {transactions.map((tx) => (
                  <div
                    key={tx.hash}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-bg-card border border-transparent hover:border-border transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center border',
                        tx.type === 'BUY'
                          ? 'bg-neon-green/5 border-neon-green/20 text-neon-green shadow-[0_0_8px_rgba(0,255,136,0.1)]'
                          : 'bg-neon-red/5 border-neon-red/20 text-neon-red shadow-[0_0_8px_rgba(255,51,102,0.1)]'
                      )}>
                        {tx.type === 'BUY' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant={tx.type === 'BUY' ? 'success' : 'danger'}>{tx.type}</Badge>
                          <Link href={`/token/${tx.tokenAddress}?chain=SOL`} className="text-xs font-mono font-bold text-text-primary hover:text-neon-green transition-colors">
                            ${tx.tokenSymbol}
                          </Link>
                        </div>
                        <span className="text-[10px] font-mono text-text-dim">
                          {formatNumber(tx.tokenAmount)} for {tx.quoteAmount.toFixed(4)} {tx.quoteSymbol}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono text-text-secondary block font-semibold">
                        {tx.usdValue > 0 ? formatUsd(tx.usdValue) : `${tx.quoteAmount.toFixed(4)} ${tx.quoteSymbol}`}
                      </span>
                      <span className="text-[9px] font-mono text-text-dim">
                        {new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-text-dim font-mono text-sm text-center py-8">
                <Crosshair className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No recent trades found
              </div>
            )}
          </Card>
        )}

        {/* ═══ AI TRADE ANALYZER ═══ */}
        <Card variant="highlighted" glow>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-neon-green/10 border border-neon-green/20 flex items-center justify-center shadow-[0_0_10px_rgba(0,255,136,0.1)]">
                <Brain className="w-4 h-4 text-neon-green" />
              </div>
              <div>
                <GlitchText text="AI TRADE ANALYZER" as="span" className="text-sm bg-gradient-to-r from-neon-green to-neon-cyan bg-clip-text text-transparent" />
                <span className="text-[9px] text-text-dim font-mono block tracking-widest">POWERED BY CLAUDE</span>
              </div>
            </div>
            {analysis && !analysisLoading && (
              <Button size="sm" variant="cyber" onClick={runAnalysis}>
                <RefreshCw className="w-3 h-3" />
                Reanalyze
              </Button>
            )}
          </div>

          {analysisLoading ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse shadow-[0_0_8px_#00ff88]" />
                <span className="text-neon-green font-mono text-[10px] uppercase tracking-widest animate-pulse">
                  Analyzing trading patterns...
                </span>
              </div>
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className={cn('h-4', i === 0 ? 'w-full' : i === 1 ? 'w-3/4' : i === 2 ? 'w-5/6' : i === 3 ? 'w-2/3' : i === 4 ? 'w-4/5' : 'w-1/2')} />
              ))}
            </div>
          ) : analysis ? (
            <div className="space-y-4">
              {[
                { title: 'Portfolio Grade', content: analysis.portfolioGrade, icon: Shield, color: 'text-neon-green' },
                { title: 'PnL Analysis', content: analysis.pnlAnalysis, icon: TrendingUp, color: 'text-neon-cyan' },
                { title: 'Trading Patterns', content: analysis.tradingPatterns, icon: Activity, color: 'text-neon-magenta' },
                { title: 'Risk Assessment', content: analysis.riskAssessment, icon: Target, color: 'text-neon-red' },
                { title: 'Recommendations', content: analysis.recommendations, icon: Zap, color: 'text-neon-green' },
                { title: 'Trader Score', content: analysis.traderScore, icon: Crosshair, color: 'text-neon-cyan' },
              ].filter((s) => s.content).map((section) => (
                <div key={section.title} className="border-l-2 border-neon-green/20 pl-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <section.icon className={cn('w-3 h-3', section.color)} />
                    <span className="text-[9px] text-text-dim uppercase tracking-widest font-mono font-semibold">
                      {section.title}
                    </span>
                  </div>
                  <p className="text-text-secondary font-mono text-xs leading-relaxed whitespace-pre-wrap">
                    {section.content}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Brain className="w-10 h-10 mx-auto mb-3 text-text-dim opacity-30" />
              <p className="text-text-dim font-mono text-sm">
                {portfolio && transactions.length > 0
                  ? 'Initializing analysis...'
                  : 'Connect wallet and load trades for AI analysis'}
              </p>
            </div>
          )}
        </Card>

      </main>
    </div>
  )
}
