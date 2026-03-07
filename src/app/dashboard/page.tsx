'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Wallet,
  Eye,
  Clock,
  Trash2,
  ExternalLink,
  Search,
  Plus,
  TrendingUp,
  TrendingDown,
  Shield,
  Bell,
  Activity,
  BarChart3,
  Zap,
  StickyNote,
  X,
  RefreshCw,
  ChevronRight,
  Crosshair,
} from 'lucide-react'
import { createSupabaseBrowser } from '@/lib/db/supabase-browser'
import { Header } from '@/components/layout/header'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  shortenAddress,
  timeAgo,
  cn,
  formatUsd,
  formatPct,
  formatNumber,
  formatPrice,
  detectChain,
} from '@/lib/utils'
import { useSavedTokens, type SavedTokenLive } from '@/hooks/use-saved-tokens'
import type { SavedWallet, WatchlistItem, ScanHistoryEntry, Chain, Alert } from '@/types'

// ═══════════════════════════════════════════
// MEMESCOPE COMMAND CENTER — Dashboard
// ═══════════════════════════════════════════

export default function DashboardPage() {
  // ── Core state ──
  const { tokens, loading: tokensLoading, error: tokensError, refetch: refetchTokens, removeToken } = useSavedTokens()
  const [wallets, setWallets] = useState<SavedWallet[]>([])
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState({ wallets: true, history: true, alerts: true })

  // ── Quick add state ──
  const [addAddress, setAddAddress] = useState('')
  const [addChain, setAddChain] = useState<Chain>('SOL')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  // ── Note modal state ──
  const [noteModal, setNoteModal] = useState<{ token: SavedTokenLive; note: string } | null>(null)
  const [savingNote, setSavingNote] = useState(false)

  // ── Refreshing state ──
  const [refreshing, setRefreshing] = useState(false)

  // ── Data fetching ──
  useEffect(() => {
    fetchWallets()
    fetchScanHistory()
    fetchAlerts()
  }, [])

  async function fetchWallets() {
    try {
      const res = await fetch('/api/user/wallets')
      if (res.ok) {
        const data = await res.json()
        setWallets(data)
      }
    } catch {
      // silently fail
    } finally {
      setLoading((prev) => ({ ...prev, wallets: false }))
    }
  }

  async function fetchScanHistory() {
    try {
      const supabase = createSupabaseBrowser()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setLoading((prev) => ({ ...prev, history: false }))
        return
      }
      const { data } = await supabase
        .from('scan_history')
        .select('*')
        .eq('user_id', user.id)
        .order('scanned_at', { ascending: false })
        .limit(20)

      if (data) setScanHistory(data)
    } catch {
      // silently fail
    } finally {
      setLoading((prev) => ({ ...prev, history: false }))
    }
  }

  async function fetchAlerts() {
    try {
      const res = await fetch('/api/user/alert')
      if (res.ok) {
        const data = await res.json()
        setAlerts(data)
      }
    } catch {
      // silently fail
    } finally {
      setLoading((prev) => ({ ...prev, alerts: false }))
    }
  }

  // ── Actions ──
  async function removeWallet(id: string) {
    const supabase = createSupabaseBrowser()
    await supabase.from('saved_wallets').delete().eq('id', id)
    setWallets((prev) => prev.filter((w) => w.id !== id))
  }

  async function removeWatchlistItem(id: string) {
    const supabase = createSupabaseBrowser()
    await supabase.from('watchlist').delete().eq('id', id)
    removeToken(id)
  }

  async function handleAddToken() {
    if (!addAddress.trim()) return
    setAdding(true)
    setAddError('')

    const detected = detectChain(addAddress.trim())
    const chain = detected || addChain

    try {
      const res = await fetch('/api/user/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_address: addAddress.trim(), chain }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to add')
      }
      setAddAddress('')
      await refetchTokens()
    } catch (err: any) {
      setAddError(err.message)
    } finally {
      setAdding(false)
    }
  }

  async function handleSaveNote() {
    if (!noteModal) return
    setSavingNote(true)
    try {
      await fetch('/api/user/token-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token_address: noteModal.token.token_address,
          note: noteModal.note,
        }),
      })
      await refetchTokens()
      setNoteModal(null)
    } catch {
      // silently fail
    } finally {
      setSavingNote(false)
    }
  }

  const handleRefreshAll = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([refetchTokens(), fetchWallets(), fetchScanHistory(), fetchAlerts()])
    setRefreshing(false)
  }, [refetchTokens])

  // ── Computed stats ──
  const totalValue = tokens.reduce((sum, t) => sum + (t.live.marketCap > 0 ? t.live.price : 0), 0)
  const avgChange =
    tokens.length > 0
      ? tokens.reduce((sum, t) => sum + t.live.priceChange24h, 0) / tokens.length
      : 0
  const bestPerformer = tokens.length > 0
    ? tokens.reduce((best, t) => (t.live.priceChange24h > best.live.priceChange24h ? t : best), tokens[0])
    : null
  const avgSafety = 0 // Safety data not fetched in bulk — placeholder
  const activeAlerts = alerts.filter((a) => a.enabled).length

  return (
    <div className="min-h-screen bg-bg-deep">
      <Header />

      <main className="max-w-[1440px] mx-auto px-4 sm:px-7 py-5 space-y-6">
        {/* ── HEADER ROW ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-gradient-to-b from-neon-green to-neon-blue rounded-full" />
            <div>
              <h1 className="text-2xl font-bold text-text-primary font-mono tracking-tight">
                COMMAND CENTER
              </h1>
              <p className="text-[10px] font-mono text-text-dim uppercase tracking-[0.25em]">
                Portfolio Monitor / Live Feed
              </p>
            </div>
          </div>
          <button
            onClick={handleRefreshAll}
            className={cn(
              'p-2 rounded-lg border border-border text-text-dim hover:text-neon-green hover:border-neon-green/30 transition-all',
              refreshing && 'animate-spin text-neon-green border-neon-green/30'
            )}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* ═══ 1. PORTFOLIO OVERVIEW — STAT CARDS ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard
            label="Tokens Tracked"
            value={tokens.length.toString()}
            icon={<Crosshair className="w-4 h-4" />}
            color="text-neon-blue"
            loading={tokensLoading}
          />
          <StatCard
            label="Best Performer"
            value={
              bestPerformer
                ? `${bestPerformer.live.ticker}`
                : '--'
            }
            sub={
              bestPerformer
                ? formatPct(bestPerformer.live.priceChange24h)
                : undefined
            }
            subColor={bestPerformer && bestPerformer.live.priceChange24h >= 0 ? 'text-neon-green' : 'text-neon-red'}
            icon={<TrendingUp className="w-4 h-4" />}
            color="text-neon-green"
            loading={tokensLoading}
          />
          <StatCard
            label="Avg 24h Change"
            value={formatPct(avgChange)}
            icon={<BarChart3 className="w-4 h-4" />}
            color={avgChange >= 0 ? 'text-neon-green' : 'text-neon-red'}
            loading={tokensLoading}
          />
          <StatCard
            label="Active Alerts"
            value={activeAlerts.toString()}
            icon={<Bell className="w-4 h-4" />}
            color="text-neon-yellow"
            loading={loading.alerts}
          />
          <StatCard
            label="Saved Wallets"
            value={wallets.length.toString()}
            icon={<Wallet className="w-4 h-4" />}
            color="text-neon-purple"
            loading={loading.wallets}
          />
        </div>

        {/* ═══ 2. QUICK TOKEN SEARCH ═══ */}
        <Card className="border-border/60">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-neon-green" />
            <span className="text-[10px] font-mono text-text-dim uppercase tracking-[0.2em] font-semibold">
              Quick Add Token
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={addAddress}
                onChange={(e) => {
                  setAddAddress(e.target.value)
                  setAddError('')
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleAddToken()}
                placeholder="Paste token contract address..."
                className="w-full bg-bg-card border border-border rounded-lg px-4 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-dim/50 focus:outline-none focus:border-neon-green/50 focus:shadow-[0_0_12px_rgba(0,255,136,0.08)] transition-all"
              />
              {addAddress && (
                <button
                  onClick={() => { setAddAddress(''); setAddError('') }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-primary"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <select
                value={addChain}
                onChange={(e) => setAddChain(e.target.value as Chain)}
                className="bg-bg-card border border-border rounded-lg px-3 py-2.5 text-xs font-mono text-text-secondary focus:outline-none focus:border-neon-green/50 transition-all"
              >
                <option value="SOL">SOL</option>
                <option value="ETH">ETH</option>
                <option value="BASE">BASE</option>
                <option value="BSC">BSC</option>
              </select>
              <Button
                onClick={handleAddToken}
                loading={adding}
                disabled={!addAddress.trim()}
                size="md"
                variant="outline"
                className="whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </Button>
            </div>
          </div>
          {addError && (
            <p className="text-neon-red text-xs font-mono mt-2">{addError}</p>
          )}
        </Card>

        {/* ═══ 3. SAVED TOKENS GRID ═══ */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-neon-green shadow-[0_0_6px_#00ff88] animate-pulse-dot" />
              <h2 className="text-[11px] font-mono text-text-dim uppercase tracking-[0.2em] font-semibold">
                Tracked Tokens
              </h2>
              <span className="text-[10px] font-mono text-text-dim/60">
                ({tokens.length})
              </span>
            </div>
            {tokens.length > 0 && (
              <span className="text-[9px] font-mono text-text-dim/40 uppercase tracking-widest">
                Auto-refresh 30s
              </span>
            )}
          </div>

          {tokensLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="space-y-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </Card>
              ))}
            </div>
          ) : tokensError ? (
            <Card>
              <div className="text-center py-8">
                <p className="text-neon-red font-mono text-sm">{tokensError}</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={refetchTokens}>
                  Retry
                </Button>
              </div>
            </Card>
          ) : tokens.length === 0 ? (
            <Card className="border-dashed border-border/60">
              <div className="text-center py-10">
                <Eye className="w-8 h-8 text-text-dim/30 mx-auto mb-3" />
                <p className="text-text-dim font-mono text-sm">No tokens tracked yet.</p>
                <p className="text-text-dim/60 font-mono text-xs mt-1">
                  Paste a contract address above or view a token and click &quot;Add to Watchlist&quot;
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {tokens.map((token) => (
                <TokenCard
                  key={token.id}
                  token={token}
                  onRemove={() => removeWatchlistItem(token.id)}
                  onNote={() => setNoteModal({ token, note: token.label || '' })}
                />
              ))}
            </div>
          )}
        </section>

        {/* ═══ 4. SAVED WALLETS ═══ */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-neon-purple" />
            <h2 className="text-[11px] font-mono text-text-dim uppercase tracking-[0.2em] font-semibold">
              Saved Wallets
            </h2>
            <span className="text-[10px] font-mono text-text-dim/60">
              ({wallets.length})
            </span>
          </div>

          {loading.wallets ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </Card>
              ))}
            </div>
          ) : wallets.length === 0 ? (
            <Card className="border-dashed border-border/60">
              <div className="text-center py-8">
                <Wallet className="w-7 h-7 text-text-dim/30 mx-auto mb-2" />
                <p className="text-text-dim font-mono text-sm">No saved wallets.</p>
                <p className="text-text-dim/60 font-mono text-xs mt-1">
                  Scan a wallet and click &quot;Save Wallet&quot; to track it here.
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {wallets.map((wallet) => (
                <Card key={wallet.id} glow className="group relative overflow-hidden">
                  {/* Subtle gradient accent */}
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-purple/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-text-primary font-semibold">
                          {shortenAddress(wallet.address)}
                        </span>
                        <Badge variant="chain" chain={wallet.chain}>
                          {' '}
                        </Badge>
                      </div>
                      {wallet.label && (
                        <p className="text-text-dim font-mono text-[10px] truncate max-w-[200px]">
                          {wallet.label}
                        </p>
                      )}
                      <p className="text-text-dim/50 font-mono text-[9px]">
                        Added {timeAgo(wallet.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeWallet(wallet.id)}
                      className="text-text-dim/40 hover:text-neon-red transition-colors p-1 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border/40">
                    <Link href={`/scan?address=${wallet.address}`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full">
                        <Zap className="w-3 h-3" />
                        Quick Scan
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* ═══ 5. RECENT ACTIVITY FEED ═══ */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-neon-blue" />
            <h2 className="text-[11px] font-mono text-text-dim uppercase tracking-[0.2em] font-semibold">
              Recent Activity
            </h2>
          </div>

          {loading.history ? (
            <Card>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </Card>
          ) : scanHistory.length === 0 ? (
            <Card className="border-dashed border-border/60">
              <div className="text-center py-8">
                <Clock className="w-7 h-7 text-text-dim/30 mx-auto mb-2" />
                <p className="text-text-dim font-mono text-sm">No activity yet.</p>
                <p className="text-text-dim/60 font-mono text-xs mt-1">
                  Your wallet scans and token views will appear here.
                </p>
              </div>
            </Card>
          ) : (
            <Card className="divide-y divide-border/30">
              <div className="space-y-0">
                {scanHistory.map((entry, idx) => (
                  <Link
                    key={entry.id}
                    href={`/scan?address=${entry.address}`}
                    className={cn(
                      'flex items-center justify-between py-3 px-1 group hover:bg-bg-hover/50 transition-colors rounded-md -mx-1',
                      idx === 0 && 'pt-0'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-bg-card border border-border flex items-center justify-center group-hover:border-neon-blue/30 transition-colors">
                        <Search className="w-3 h-3 text-text-dim group-hover:text-neon-blue transition-colors" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-text-primary group-hover:text-neon-blue transition-colors">
                            {shortenAddress(entry.address, 6)}
                          </span>
                          <Badge variant="chain" chain={entry.chain} className="scale-90">
                            {' '}
                          </Badge>
                        </div>
                        <span className="text-text-dim/60 font-mono text-[9px]">
                          Wallet Scan
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-text-dim font-mono text-[10px]">
                        {timeAgo(entry.scanned_at)}
                      </span>
                      <ChevronRight className="w-3 h-3 text-text-dim/30 group-hover:text-neon-blue transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </section>
      </main>

      {/* ═══ NOTE MODAL ═══ */}
      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-deep/80 backdrop-blur-sm">
          <div className="bg-bg-panel border border-border rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-neon-yellow" />
                <h3 className="font-mono text-sm text-text-primary font-semibold">
                  Note for {noteModal.token.live.ticker || shortenAddress(noteModal.token.token_address)}
                </h3>
              </div>
              <button
                onClick={() => setNoteModal(null)}
                className="text-text-dim hover:text-text-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={noteModal.note}
              onChange={(e) => setNoteModal({ ...noteModal, note: e.target.value })}
              placeholder="Add a note about this token..."
              className="w-full bg-bg-card border border-border rounded-lg p-3 text-sm font-mono text-text-primary placeholder:text-text-dim/40 focus:outline-none focus:border-neon-yellow/40 resize-none h-28 transition-all"
            />
            <div className="flex justify-end gap-2 mt-3">
              <Button size="sm" variant="ghost" onClick={() => setNoteModal(null)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" loading={savingNote} onClick={handleSaveNote}>
                Save Note
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════

function StatCard({
  label,
  value,
  sub,
  subColor,
  icon,
  color,
  loading,
}: {
  label: string
  value: string
  sub?: string
  subColor?: string
  icon: React.ReactNode
  color: string
  loading: boolean
}) {
  return (
    <Card className="relative overflow-hidden group">
      {/* Top glow line */}
      <div className={cn(
        'absolute top-0 left-0 right-0 h-[1px] opacity-30',
        color === 'text-neon-green' && 'bg-neon-green',
        color === 'text-neon-red' && 'bg-neon-red',
        color === 'text-neon-blue' && 'bg-neon-blue',
        color === 'text-neon-yellow' && 'bg-neon-yellow',
        color === 'text-neon-purple' && 'bg-neon-purple',
      )} />

      <div className="flex items-start justify-between mb-2">
        <span className="text-[9px] font-mono text-text-dim uppercase tracking-[0.15em] font-semibold">
          {label}
        </span>
        <span className={cn('opacity-40', color)}>{icon}</span>
      </div>

      {loading ? (
        <Skeleton className="h-6 w-16 mt-1" />
      ) : (
        <div>
          <span className={cn('text-xl font-mono font-bold tracking-tight', color)}>
            {value}
          </span>
          {sub && (
            <span className={cn('text-xs font-mono ml-2', subColor || 'text-text-dim')}>
              {sub}
            </span>
          )}
        </div>
      )}
    </Card>
  )
}

function TokenCard({
  token,
  onRemove,
  onNote,
}: {
  token: SavedTokenLive
  onRemove: () => void
  onNote: () => void
}) {
  const change = token.live.priceChange24h
  const isPositive = change >= 0

  return (
    <Card glow className="group relative overflow-hidden">
      {/* Top accent line */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 h-[2px] transition-opacity',
          isPositive
            ? 'bg-gradient-to-r from-neon-green/60 via-neon-green/20 to-transparent'
            : 'bg-gradient-to-r from-neon-red/60 via-neon-red/20 to-transparent',
          'opacity-60 group-hover:opacity-100'
        )}
      />

      {/* Header row: name + price */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-text-primary font-bold truncate">
              {token.live.ticker !== '???' ? token.live.ticker : shortenAddress(token.token_address)}
            </span>
            <Badge variant="chain" chain={token.chain} className="scale-90 shrink-0">
              {' '}
            </Badge>
          </div>
          {token.live.name !== 'Unknown' && (
            <p className="text-text-dim font-mono text-[10px] truncate mt-0.5">
              {token.live.name}
            </p>
          )}
        </div>
        <div className="text-right shrink-0 ml-2">
          <p className="font-mono text-sm text-text-primary font-semibold">
            ${formatPrice(token.live.price)}
          </p>
          <div className={cn(
            'flex items-center justify-end gap-0.5 text-xs font-mono font-semibold',
            isPositive ? 'text-neon-green' : 'text-neon-red'
          )}>
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {formatPct(change)}
          </div>
        </div>
      </div>

      {/* Data grid */}
      <div className="grid grid-cols-3 gap-2 mb-3 py-2.5 px-2 bg-bg-card/50 rounded-md border border-border/30">
        <DataCell label="Volume 24h" value={formatUsd(token.live.volume24h)} />
        <DataCell label="Liquidity" value={formatUsd(token.live.liquidity)} />
        <DataCell label="Mkt Cap" value={formatUsd(token.live.marketCap)} />
      </div>

      {/* Note preview */}
      {token.label && (
        <div className="mb-3 px-2 py-1.5 bg-neon-yellow/5 border border-neon-yellow/10 rounded text-[10px] font-mono text-neon-yellow/70 truncate">
          <StickyNote className="w-2.5 h-2.5 inline mr-1 -mt-0.5" />
          {token.label}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5 pt-2 border-t border-border/30">
        <Link href={`/token/${token.token_address}?chain=${token.chain}`} className="flex-1">
          <Button size="sm" variant="ghost" className="w-full text-[10px]">
            <ExternalLink className="w-3 h-3" />
            Details
          </Button>
        </Link>
        <Button size="sm" variant="ghost" className="text-[10px]" onClick={onNote}>
          <StickyNote className="w-3 h-3" />
          Note
        </Button>
        <button
          onClick={onRemove}
          className="p-1.5 text-text-dim/40 hover:text-neon-red transition-colors opacity-0 group-hover:opacity-100"
          title="Remove from watchlist"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </Card>
  )
}

function DataCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[8px] font-mono text-text-dim/60 uppercase tracking-widest mb-0.5">
        {label}
      </p>
      <p className="text-[11px] font-mono text-text-secondary font-semibold">
        {value}
      </p>
    </div>
  )
}
