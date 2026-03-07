'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  Shield,
  MessageCircle,
  Brain,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Copy,
  Check,
  Users,
  Hash,
  Activity,
  Droplets,
  BarChart3,
  TrendingUp,
} from 'lucide-react'
import { useTokenData } from '@/hooks/use-token-data'
import { useTokenSafety } from '@/hooks/use-token-safety'
import { useTokenSentiment } from '@/hooks/use-token-sentiment'
import { useTokenHolders } from '@/hooks/use-token-holders'
import { PriceChart } from '@/components/charts/price-chart'
import { HolderTrendChart } from '@/components/charts/holder-trend-chart'
import { HolderFlowChart } from '@/components/charts/holder-flow-chart'
import { HolderDistributionChart } from '@/components/charts/holder-distribution-chart'
import { VolumeChart } from '@/components/charts/volume-chart'
import { Header } from '@/components/layout/header'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  formatUsd,
  formatPrice,
  formatPct,
  formatNumber,
  shortenAddress,
  cn,
  getSafetyGrade,
} from '@/lib/utils'
import type { ResearchBriefing } from '@/types'

interface TokenViewProps {
  address: string
}

export function TokenView({ address }: TokenViewProps) {
  const searchParams = useSearchParams()
  const chain = searchParams.get('chain') || 'SOL'
  const [timeframe, setTimeframe] = useState('1D')
  const [research, setResearch] = useState<ResearchBriefing | null>(null)
  const [researchLoading, setResearchLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [copied, setCopied] = useState(false)

  const { tokenData, isLoading: tokenLoading } = useTokenData(address, chain)
  const { safetyData, isLoading: safetyLoading } = useTokenSafety(address, chain)
  const { sentimentData, tweets, isLoading: sentimentLoading } = useTokenSentiment(
    address,
    tokenData?.ticker ?? null
  )
  const { holderData, isLoading: holderLoading } = useTokenHolders(address)

  const safety = getSafetyGrade(safetyData?.score ?? 0)
  const changePositive = (tokenData?.priceChange24h ?? 0) >= 0

  const handleSaveToken = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/user/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token_address: address,
          chain,
          notes: notes || null,
        }),
      })
      if (res.ok) setSaved(true)
    } catch {
      // silently fail
    } finally {
      setSaving(false)
    }
  }, [address, chain, notes])

  const handleCopyAddress = useCallback(() => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [address])

  // Build context payload with all available data
  const buildContext = useCallback(() => ({
    address,
    chain,
    ticker: tokenData?.ticker,
    name: tokenData?.name,
    price: tokenData?.price,
    priceChange24h: tokenData?.priceChange24h,
    volume24h: tokenData?.volume24h,
    liquidity: tokenData?.liquidity,
    marketCap: tokenData?.marketCap,
    totalHolders: holderData?.totalHolders,
    topHolderPct: holderData?.topHolderPct,
    concentration: holderData?.concentration,
    whaleAction: holderData?.whaleAction,
    holderChange24h: holderData?.holderChange24h,
    uniqueBuyers24h: holderData?.uniqueBuyers24h,
    uniqueSellers24h: holderData?.uniqueSellers24h,
    safetyScore: safetyData?.score,
    safetyGrade: safetyData?.grade,
    safetyFlags: safetyData?.flags,
    safetyPositives: safetyData?.positives,
    sentimentBullish: sentimentData?.bullish,
    sentimentBearish: sentimentData?.bearish,
    sentimentOverall: sentimentData?.overall,
    totalTweets: sentimentData?.totalTweets,
    topTweets: tweets?.slice(0, 5),
    meteoraPools: tokenData?.meteoraPools,
  }), [address, chain, tokenData, holderData, safetyData, sentimentData, tweets])

  // Save to token memory whenever data changes
  useEffect(() => {
    if (tokenLoading || !tokenData) return
    const ctx = buildContext()
    fetch('/api/token/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ctx),
    }).catch(() => {})
  }, [tokenData, holderData, safetyData, sentimentData, buildContext, tokenLoading])

  // Auto-trigger research once all data is loaded
  useEffect(() => {
    if (research || researchLoading) return
    if (tokenLoading || safetyLoading || sentimentLoading || holderLoading) return
    if (!tokenData) return
    generateResearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenLoading, safetyLoading, sentimentLoading, holderLoading])

  const generateResearch = async () => {
    setResearchLoading(true)
    try {
      const ctx = buildContext()
      const res = await fetch('/api/token/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ctx),
      })
      if (res.ok) {
        const data = await res.json()
        setResearch(data)
        // Save research to memory too
        fetch('/api/token/memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, chain, research: data }),
        }).catch(() => {})
      }
    } catch {
      // silently fail
    } finally {
      setResearchLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-[1440px] mx-auto px-7 py-5 space-y-5">
        {/* Back link */}
        <Link
          href="/scan"
          className="inline-flex items-center gap-2 text-text-secondary hover:text-neon-green font-mono text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Scanner
        </Link>

        {/* ── 1. HEADER ── */}
        <Card>
          {tokenLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-8 w-32" />
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xl font-bold text-text-primary">
                    {tokenData?.name ?? 'Unknown Token'}
                  </span>
                  <span className="text-text-dim font-mono text-sm">
                    ${tokenData?.ticker ?? '???'}
                  </span>
                  <Badge variant="chain" chain={chain as any}>
                    {' '}
                  </Badge>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-mono font-bold text-text-primary">
                    ${formatPrice(tokenData?.price ?? 0)}
                  </span>
                  <span
                    className={cn(
                      'font-mono text-sm font-semibold',
                      changePositive ? 'text-neon-green' : 'text-neon-red'
                    )}
                  >
                    {formatPct(tokenData?.priceChange24h ?? 0)}
                  </span>
                </div>
                {/* Token address + copy */}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-text-dim font-mono text-[10px]">
                    {shortenAddress(address, 6)}
                  </span>
                  <button
                    onClick={handleCopyAddress}
                    className="text-text-dim hover:text-neon-green transition-colors"
                    title="Copy address"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-neon-green" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                  {!holderLoading && holderData && (
                    <span className="text-text-dim font-mono text-[10px] flex items-center gap-1 ml-2">
                      <Users className="w-3 h-3" />
                      {formatNumber(holderData.totalHolders)} holders
                    </span>
                  )}
                  {tokenData?.volume24h != null && tokenData.volume24h > 0 && (
                    <span className="text-text-dim font-mono text-[10px] ml-2">
                      Vol: {formatUsd(tokenData.volume24h)}
                    </span>
                  )}
                </div>
              </div>

              {/* Save / Bookmark buttons */}
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant={saved ? 'ghost' : 'outline'}
                  loading={saving}
                  disabled={saved}
                  onClick={handleSaveToken}
                >
                  {saved ? (
                    <BookmarkCheck className="w-3.5 h-3.5 text-neon-green" />
                  ) : (
                    <Bookmark className="w-3.5 h-3.5" />
                  )}
                  {saved ? 'Saved' : 'Save Token'}
                </Button>
                {!saved && (
                  <button
                    onClick={() => setShowNotes(!showNotes)}
                    className="text-[10px] font-mono text-text-dim hover:text-neon-blue transition-colors"
                  >
                    {showNotes ? 'Hide notes' : '+ Add notes'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Notes textarea (inline) */}
          {showNotes && !saved && (
            <div className="mt-3 pt-3 border-t border-border">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this token..."
                rows={2}
                className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-text-secondary font-mono text-xs resize-none focus:outline-none focus:border-neon-green/50"
              />
            </div>
          )}
        </Card>

        {/* ── QUICK STATS BAR ── */}
        <div className="flex items-center gap-3 overflow-x-auto py-1">
          {[
            {
              icon: Users,
              label: 'Holders',
              value: holderLoading
                ? '...'
                : formatNumber(holderData?.totalHolders ?? 0),
              loading: holderLoading,
            },
            {
              icon: BarChart3,
              label: 'Vol 24h',
              value: tokenLoading
                ? '...'
                : formatUsd(tokenData?.volume24h ?? 0),
              loading: tokenLoading,
            },
            {
              icon: Activity,
              label: 'Txns 24h',
              value: tokenLoading
                ? '...'
                : formatNumber(tokenData?.txns24h ?? 0),
              loading: tokenLoading,
            },
            {
              icon: Droplets,
              label: 'Liquidity',
              value: tokenLoading
                ? '...'
                : formatUsd(tokenData?.liquidity ?? 0),
              loading: tokenLoading,
            },
            {
              icon: Shield,
              label: 'Safety',
              value: safetyLoading
                ? '...'
                : `${safetyData?.score ?? '?'}/100`,
              loading: safetyLoading,
              color: safetyData
                ? safety.grade === 'SAFE'
                  ? 'text-neon-green'
                  : safety.grade === 'CAUTION'
                    ? 'text-neon-yellow'
                    : 'text-neon-red'
                : 'text-text-dim',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-2 px-3 py-2 bg-bg-panel border border-border rounded-lg whitespace-nowrap"
            >
              <stat.icon className="w-3.5 h-3.5 text-text-dim flex-shrink-0" />
              <span className="text-[9px] text-text-dim font-mono uppercase tracking-widest">
                {stat.label}
              </span>
              {stat.loading ? (
                <Skeleton className="h-4 w-12" />
              ) : (
                <span
                  className={cn(
                    'text-xs font-mono font-semibold',
                    stat.color ?? 'text-text-primary'
                  )}
                >
                  {stat.value}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* ── 2. PRICE CHART ── */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] text-text-dim uppercase tracking-widest font-mono font-semibold">
              Price Action
            </span>
          </div>
          {tokenLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <PriceChart
              priceHistory={tokenData?.priceHistory ?? []}
              activeTimeframe={timeframe}
              onTimeframeChange={setTimeframe}
            />
          )}
        </Card>

        {/* ── 2b. VOLUME CHART ── */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] text-text-dim uppercase tracking-widest font-mono font-semibold">
              Volume
            </span>
          </div>
          {tokenLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (
            <VolumeChart volumeHistory={tokenData?.volumeHistory ?? []} />
          )}
        </Card>

        {/* ── 3. MARKET STATS ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Volume 24h', value: tokenData?.volume24h },
            { label: 'Transactions 24h', value: tokenData?.txns24h, isCount: true },
            { label: 'Liquidity', value: tokenData?.liquidity },
            { label: 'Market Cap', value: tokenData?.marketCap },
          ].map((stat) => (
            <Card key={stat.label}>
              {tokenLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-24" />
                </div>
              ) : (
                <>
                  <span className="text-[9px] text-text-dim uppercase tracking-widest font-mono block mb-1">
                    {stat.label}
                  </span>
                  <span className="text-sm font-mono text-text-primary font-semibold">
                    {stat.isCount
                      ? formatNumber(stat.value ?? 0)
                      : formatUsd(stat.value ?? 0)}
                  </span>
                </>
              )}
            </Card>
          ))}
        </div>

        {/* ── 3b. METEORA POOLS ── */}
        {tokenData?.meteoraPools && tokenData.meteoraPools.length > 0 && (
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Droplets className="w-3.5 h-3.5 text-neon-cyan" />
              <span className="text-[10px] text-text-dim uppercase tracking-widest font-mono font-semibold">
                Meteora DLMM Pools
              </span>
              <span className="text-[9px] text-text-dim font-mono ml-auto">
                {tokenData.meteoraPools.length} pool{tokenData.meteoraPools.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-2">
              {/* Summary row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                {[
                  { label: 'Total TVL', value: `$${tokenData.meteoraPools.reduce((s, p) => s + p.liquidity, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
                  { label: '24h Volume', value: `$${tokenData.meteoraPools.reduce((s, p) => s + p.volume24h, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
                  { label: '24h Fees', value: `$${tokenData.meteoraPools.reduce((s, p) => s + p.fees24h, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
                  { label: 'Best APR', value: `${Math.max(...tokenData.meteoraPools.map(p => p.apr)).toFixed(1)}%` },
                ].map((s) => (
                  <div key={s.label} className="bg-bg-panel border border-border rounded-lg px-3 py-2">
                    <span className="text-[9px] text-text-dim font-mono uppercase tracking-widest block">{s.label}</span>
                    <span className="text-sm font-mono text-neon-cyan font-semibold">{s.value}</span>
                  </div>
                ))}
              </div>
              {/* Individual pools */}
              <div className="space-y-1">
                <div className="grid grid-cols-[1fr_80px_80px_80px_60px_60px] gap-2 px-3 py-1 text-[8px] text-text-dim uppercase tracking-widest font-mono border-b border-border">
                  <span>Pool</span>
                  <span className="text-right">TVL</span>
                  <span className="text-right">24h Vol</span>
                  <span className="text-right">24h Fees</span>
                  <span className="text-right">APR</span>
                  <span className="text-right">Bin</span>
                </div>
                {tokenData.meteoraPools.slice(0, 5).map((pool) => (
                  <div
                    key={pool.address}
                    className="grid grid-cols-[1fr_80px_80px_80px_60px_60px] gap-2 items-center px-3 py-2 rounded-lg hover:bg-bg-card border border-transparent hover:border-neon-cyan/10 transition-all"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-mono font-bold text-text-primary block truncate">{pool.name}</span>
                      <span className="text-[9px] font-mono text-text-dim">{pool.baseFee}% fee</span>
                    </div>
                    <span className="text-xs font-mono text-text-primary text-right">${pool.liquidity >= 1000 ? `${(pool.liquidity / 1000).toFixed(1)}k` : pool.liquidity.toFixed(0)}</span>
                    <span className="text-xs font-mono text-text-secondary text-right">${pool.volume24h >= 1000 ? `${(pool.volume24h / 1000).toFixed(1)}k` : pool.volume24h.toFixed(0)}</span>
                    <span className="text-xs font-mono text-neon-green text-right">${pool.fees24h >= 1000 ? `${(pool.fees24h / 1000).toFixed(1)}k` : pool.fees24h.toFixed(0)}</span>
                    <span className={cn('text-xs font-mono text-right font-bold', pool.apr > 0 ? 'text-neon-green' : 'text-text-dim')}>{pool.apr.toFixed(1)}%</span>
                    <span className="text-xs font-mono text-text-dim text-right">{pool.binStep}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* ── 4. HOLDER ANALYSIS ── */}
        <div className="space-y-3">
          <span className="text-[10px] text-text-dim uppercase tracking-widest font-mono font-semibold">
            Holder Analysis
          </span>
          {holderLoading ? (
            <div className="grid grid-cols-2 gap-3">
              <Card><Skeleton className="h-[200px]" /></Card>
              <Card><Skeleton className="h-[200px]" /></Card>
              <Card><Skeleton className="h-[200px]" /></Card>
              <Card><Skeleton className="h-[200px]" /></Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card>
                <span className="text-[9px] text-text-dim uppercase tracking-widest font-mono block mb-2">
                  Holder Trend
                </span>
                <HolderTrendChart holderHistory={holderData?.holderHistory ?? []} />
              </Card>
              <Card>
                <span className="text-[9px] text-text-dim uppercase tracking-widest font-mono block mb-2">
                  Holder Flow
                </span>
                <HolderFlowChart holderFlow={holderData?.holderFlow ?? []} />
              </Card>
              <Card>
                <span className="text-[9px] text-text-dim uppercase tracking-widest font-mono block mb-2">
                  Distribution
                </span>
                <HolderDistributionChart
                  distribution={holderData?.distribution ?? []}
                  totalHolders={holderData?.totalHolders}
                />
              </Card>
              {/* Top Holders table */}
              <Card>
                <span className="text-[9px] text-text-dim uppercase tracking-widest font-mono block mb-2">
                  Holder Stats
                </span>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] text-text-dim font-mono block">Top Holders</span>
                      <span className="text-sm font-mono text-text-primary">
                        {formatNumber(holderData?.totalHolders ?? 0)} tracked
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-text-dim font-mono block">Net Flow 24h</span>
                      <span
                        className={cn(
                          'text-sm font-mono',
                          (holderData?.holderChange24h ?? 0) >= 0
                            ? 'text-neon-green'
                            : 'text-neon-red'
                        )}
                      >
                        {(holderData?.holderChange24h ?? 0) >= 0 ? '+' : ''}{holderData?.holderChange24h ?? 0} wallets
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-text-dim font-mono block">Top Holder %</span>
                      <span className="text-sm font-mono text-text-primary">
                        {(holderData?.topHolderPct ?? 0).toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-text-dim font-mono block">Concentration</span>
                      <span className="text-sm font-mono text-text-primary">
                        {(holderData?.concentration ?? 0).toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-text-dim font-mono block">Buyers 24h</span>
                      <span className="text-sm font-mono text-neon-green">
                        {formatNumber(holderData?.uniqueBuyers24h ?? 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-text-dim font-mono block">Sellers 24h</span>
                      <span className="text-sm font-mono text-neon-red">
                        {formatNumber(holderData?.uniqueSellers24h ?? 0)}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <span className="text-[9px] text-text-dim font-mono block mb-1">Whale Action</span>
                    <Badge
                      variant={
                        holderData?.whaleAction === 'accumulating'
                          ? 'success'
                          : holderData?.whaleAction === 'dumping'
                            ? 'danger'
                            : 'warning'
                      }
                    >
                      {holderData?.whaleAction ?? 'unknown'}
                    </Badge>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* ── 5. SAFETY SCANNER ── */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-text-dim" />
            <span className="text-[10px] text-text-dim uppercase tracking-widest font-mono font-semibold">
              Safety Scanner
            </span>
          </div>
          {safetyLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : safetyData ? (
            <div className="space-y-4">
              {/* Score + grade */}
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center',
                    safety.grade === 'SAFE'
                      ? 'border-neon-green'
                      : safety.grade === 'CAUTION'
                        ? 'border-neon-yellow'
                        : 'border-neon-red'
                  )}
                >
                  <span
                    className={cn(
                      'font-mono text-xl font-bold',
                      safety.grade === 'SAFE'
                        ? 'text-neon-green'
                        : safety.grade === 'CAUTION'
                          ? 'text-neon-yellow'
                          : 'text-neon-red'
                    )}
                  >
                    {safetyData.score}
                  </span>
                </div>
                <div>
                  <Badge
                    variant={
                      safety.grade === 'SAFE'
                        ? 'success'
                        : safety.grade === 'CAUTION'
                          ? 'warning'
                          : 'danger'
                    }
                  >
                    {safetyData.grade}
                  </Badge>
                  <p className="text-text-dim font-mono text-[10px] mt-1">
                    {safetyData.score}/100
                  </p>
                </div>
              </div>

              {/* Positives + Flags */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[9px] text-text-dim uppercase tracking-widest font-mono block">
                    Positives
                  </span>
                  {safetyData.positives.length > 0 ? (
                    safetyData.positives.map((msg, i) => (
                      <div key={i} className="flex items-start gap-1.5 py-0.5">
                        <span className="text-neon-green text-xs mt-px">{'\u2713'}</span>
                        <span className="text-text-secondary font-mono text-[11px]">{msg}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-text-dim font-mono text-[11px]">None</span>
                  )}
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] text-text-dim uppercase tracking-widest font-mono block">
                    Flags
                  </span>
                  {safetyData.flags.length > 0 ? (
                    safetyData.flags.map((msg, i) => (
                      <div key={i} className="flex items-start gap-1.5 py-0.5">
                        <span className="text-neon-red text-xs mt-px">{'\u2717'}</span>
                        <span className="text-text-secondary font-mono text-[11px]">{msg}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-text-dim font-mono text-[11px]">None</span>
                  )}
                </div>
              </div>

              {/* Detailed checks */}
              {safetyData.checks && (
                <div className="bg-bg-card border border-border rounded-lg p-3">
                  <span className="text-[9px] text-text-dim uppercase tracking-widest font-mono block mb-2">
                    Detailed Checks
                  </span>
                  {[
                    { label: 'LP Locked', pass: safetyData.checks.lpLocked, value: safetyData.checks.lpLocked ? `${safetyData.checks.lpLockedPct} for ${safetyData.checks.lpLockDuration}` : 'Not locked' },
                    { label: 'Honeypot', pass: !safetyData.checks.honeypot, value: safetyData.checks.honeypot ? 'Detected' : 'Clean' },
                    { label: 'Mint Authority', pass: !safetyData.checks.mintAuthority, value: safetyData.checks.mintAuthority ? 'Enabled' : 'Disabled' },
                    { label: 'Freeze Authority', pass: !safetyData.checks.freezeAuthority, value: safetyData.checks.freezeAuthority ? 'Enabled' : 'Disabled' },
                    { label: 'Contract Renounced', pass: safetyData.checks.contractRenounced, value: safetyData.checks.contractRenounced ? 'Yes' : 'No' },
                    { label: 'Buy Tax', pass: parseFloat(safetyData.checks.buyTax ?? '0') <= 5, value: safetyData.checks.buyTax ?? '0%' },
                    { label: 'Sell Tax', pass: parseFloat(safetyData.checks.sellTax ?? '0') <= 5, value: safetyData.checks.sellTax ?? '0%' },
                  ].map((check) => (
                    <div
                      key={check.label}
                      className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className={check.pass ? 'text-neon-green' : 'text-neon-red'}>
                          {check.pass ? '\u2713' : '\u2717'}
                        </span>
                        <span className="text-text-secondary font-mono text-xs">{check.label}</span>
                      </div>
                      <span className="text-text-dim font-mono text-[10px]">{check.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-text-dim font-mono text-sm text-center py-6">
              Safety data unavailable
            </div>
          )}
        </Card>

        {/* ── 6. TWITTER SENTIMENT ── */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-4 h-4 text-text-dim" />
            <span className="text-[10px] text-text-dim uppercase tracking-widest font-mono font-semibold">
              Twitter Sentiment
            </span>
          </div>
          {sentimentLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : sentimentData ? (
            <div className="space-y-4">
              {/* Sentiment bar */}
              <div className="space-y-2">
                <div className="flex h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-neon-green transition-all"
                    style={{ width: `${sentimentData.bullish}%` }}
                  />
                  <div
                    className="bg-text-dim transition-all"
                    style={{ width: `${sentimentData.neutral}%` }}
                  />
                  <div
                    className="bg-neon-red transition-all"
                    style={{ width: `${sentimentData.bearish}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-neon-green">{sentimentData.bullish.toFixed(0)}% Bullish</span>
                  <span className="text-text-dim">{sentimentData.neutral.toFixed(0)}% Neutral</span>
                  <span className="text-neon-red">{sentimentData.bearish.toFixed(0)}% Bearish</span>
                </div>
                <div className="text-center">
                  <span className="text-text-dim font-mono text-[10px]">
                    Overall Score:{' '}
                    <span
                      className={cn(
                        'font-semibold',
                        sentimentData.overall >= 0.3
                          ? 'text-neon-green'
                          : sentimentData.overall <= -0.3
                            ? 'text-neon-red'
                            : 'text-text-secondary'
                      )}
                    >
                      {sentimentData.overall.toFixed(2)}
                    </span>
                    {' '}({sentimentData.totalTweets} tweets)
                  </span>
                </div>
              </div>

              {/* Top tweets */}
              {tweets && tweets.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[9px] text-text-dim uppercase tracking-widest font-mono block">
                    Top Tweets
                  </span>
                  {tweets.slice(0, 5).map((tweet) => (
                    <div
                      key={tweet.id}
                      className="bg-bg-card border border-border rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs text-text-primary font-semibold">
                          @{tweet.username}
                        </span>
                        <Badge
                          variant={
                            tweet.sentiment === 'bullish'
                              ? 'success'
                              : tweet.sentiment === 'bearish'
                                ? 'danger'
                                : 'default'
                          }
                        >
                          {tweet.sentiment}
                        </Badge>
                      </div>
                      <p className="text-text-secondary font-mono text-[11px] leading-relaxed">
                        {tweet.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-text-dim font-mono text-sm text-center py-6">
              Sentiment data unavailable
            </div>
          )}
        </Card>

        {/* ── 7. COMMUNITY & MENTIONS ── */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-text-dim" />
            <span className="text-[10px] text-text-dim uppercase tracking-widest font-mono font-semibold">
              Community
            </span>
          </div>

          {sentimentLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Community stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <span className="text-[9px] text-text-dim uppercase tracking-widest font-mono block">
                    Twitter Mentions
                  </span>
                  <span className="text-sm font-mono text-text-primary font-semibold">
                    {sentimentData?.totalTweets ?? 0}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-text-dim uppercase tracking-widest font-mono block">
                    Sentiment Score
                  </span>
                  <span
                    className={cn(
                      'text-sm font-mono font-semibold',
                      (sentimentData?.overall ?? 0) >= 0.3
                        ? 'text-neon-green'
                        : (sentimentData?.overall ?? 0) <= -0.3
                          ? 'text-neon-red'
                          : 'text-text-secondary'
                    )}
                  >
                    {sentimentData?.overall?.toFixed(2) ?? 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-text-dim uppercase tracking-widest font-mono block">
                    Holders
                  </span>
                  <span className="text-sm font-mono text-text-primary font-semibold">
                    {formatNumber(holderData?.totalHolders ?? 0)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-text-dim uppercase tracking-widest font-mono block">
                    Whale Action
                  </span>
                  <Badge
                    variant={
                      holderData?.whaleAction === 'accumulating'
                        ? 'success'
                        : holderData?.whaleAction === 'dumping'
                          ? 'danger'
                          : 'warning'
                    }
                  >
                    {holderData?.whaleAction ?? 'unknown'}
                  </Badge>
                </div>
              </div>

              {/* Recent mentions feed */}
              {tweets && tweets.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[9px] text-text-dim uppercase tracking-widest font-mono block">
                    Recent Mentions
                  </span>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {tweets.map((tweet) => (
                      <div
                        key={tweet.id}
                        className="bg-bg-card border border-border rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-text-primary font-semibold">
                              @{tweet.username}
                            </span>
                            {tweet.verified && (
                              <span className="text-neon-blue text-[10px]">VERIFIED</span>
                            )}
                            <span className="text-text-dim font-mono text-[9px]">
                              {formatNumber(tweet.followers)} followers
                            </span>
                          </div>
                          <Badge
                            variant={
                              tweet.sentiment === 'bullish'
                                ? 'success'
                                : tweet.sentiment === 'bearish'
                                  ? 'danger'
                                  : 'default'
                            }
                          >
                            {tweet.sentiment}
                          </Badge>
                        </div>
                        <p className="text-text-secondary font-mono text-[11px] leading-relaxed">
                          {tweet.text}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-text-dim font-mono text-[9px]">
                          <span>{formatNumber(tweet.likes)} likes</span>
                          <span>{formatNumber(tweet.impressions)} views</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!tweets?.length && (
                <div className="text-text-dim font-mono text-sm text-center py-4">
                  No community mentions found
                </div>
              )}
            </div>
          )}
        </Card>

        {/* ── 8. AI RESEARCH ── */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-text-dim" />
              <span className="text-[10px] text-text-dim uppercase tracking-widest font-mono font-semibold">
                AI Research
              </span>
            </div>
            {research && !researchLoading && (
              <Button
                size="sm"
                variant="ghost"
                onClick={generateResearch}
              >
                Regenerate
              </Button>
            )}
          </div>

          {researchLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-4/5" />
              <p className="text-text-dim font-mono text-[10px] text-center mt-2">Analyzing token data with AI...</p>
            </div>
          ) : research ? (
            <div className="space-y-4">
              {[
                { title: 'Overview', content: research.overview },
                { title: 'Chart Analysis', content: research.chartAnalysis },
                { title: 'Holder Analysis', content: research.holderAnalysis },
                { title: 'Sentiment', content: research.sentiment },
                { title: 'Risk Assessment', content: research.riskAssessment },
                { title: 'Verdict', content: research.verdict },
              ].filter(s => s.content).map((section) => (
                <div key={section.title}>
                  <span className="text-[9px] text-text-dim uppercase tracking-widest font-mono block mb-1">
                    {section.title}
                  </span>
                  <p className="text-text-secondary font-mono text-xs leading-relaxed">
                    {section.content}
                  </p>
                </div>
              ))}
              {research.sources.length > 0 && (
                <div>
                  <span className="text-[9px] text-text-dim uppercase tracking-widest font-mono block mb-1">
                    Sources
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {research.sources.map((src, i) => (
                      <span key={i} className="text-neon-blue font-mono text-[10px]">
                        {src}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-text-dim font-mono text-sm text-center py-6">
              Waiting for token data to load...
            </div>
          )}
        </Card>
      </main>
    </div>
  )
}
