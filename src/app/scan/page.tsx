'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Save, Eye, ExternalLink, AlertTriangle } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { WalletSearch } from '@/components/wallet/wallet-search'
import { WalletOverview } from '@/components/wallet/wallet-overview'
import { PositionTabs } from '@/components/wallet/position-tabs'
import { TokenDetail } from '@/components/token/token-detail'
import { useWalletScan } from '@/hooks/use-wallet-scan'
import { createSupabaseBrowser } from '@/lib/db/supabase-browser'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { User } from '@supabase/supabase-js'

export default function ScanPage() {
  const router = useRouter()
  const {
    walletData,
    positions,
    selectedPosition,
    setSelectedPosition,
    isScanning,
    error,
    scanWallet,
  } = useWalletScan()

  const searchParams = useSearchParams()
  const [user, setUser] = useState<User | null>(null)
  const [savingWallet, setSavingWallet] = useState(false)
  const [walletSaved, setWalletSaved] = useState(false)
  const [watchlistAdded, setWatchlistAdded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const supabase = createSupabaseBrowser()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  // Auto-scan if address in query params; support token redirect via ?token= param
  useEffect(() => {
    const address = searchParams.get('address')
    const token = searchParams.get('token')
    if (token) {
      router.push(`/token/${encodeURIComponent(token)}?chain=SOL`)
      return
    }
    if (address) {
      scanWallet(address)
    }
  }, [searchParams, scanWallet, router])

  const handleSaveWallet = async () => {
    if (!walletData) return
    setSavingWallet(true)
    try {
      const res = await fetch('/api/user/wallet/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: walletData.address,
          chain: walletData.chain,
        }),
      })
      if (res.ok) setWalletSaved(true)
    } catch {
      // silently fail
    } finally {
      setSavingWallet(false)
    }
  }

  const handleAddToWatchlist = async (tokenAddress: string, chain: string) => {
    try {
      const res = await fetch('/api/user/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_address: tokenAddress, chain }),
      })
      if (res.ok) {
        setWatchlistAdded((prev) => ({ ...prev, [tokenAddress]: true }))
      }
    } catch {
      // silently fail
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-[1440px] mx-auto px-7 py-5">
        <WalletSearch onScan={scanWallet} isScanning={isScanning} />

        {/* Error state */}
        {error && !isScanning && (
          <Card className="mt-4">
            <div className="flex items-center gap-3 py-4">
              <AlertTriangle className="w-5 h-5 text-neon-red flex-shrink-0" />
              <div>
                <p className="text-neon-red font-mono text-sm font-semibold">Scan Failed</p>
                <p className="text-text-secondary font-mono text-xs mt-1">{error}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto"
                onClick={() => walletData && scanWallet(walletData.address)}
              >
                Try Again
              </Button>
            </div>
          </Card>
        )}

        {/* Loading skeleton */}
        {isScanning && (
          <div className="animate-fade-in space-y-4 mt-4">
            <div className="grid grid-cols-5 gap-2.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Card key={i}>
                  <Skeleton className="h-3 w-16 mb-2" />
                  <Skeleton className="h-6 w-24" />
                </Card>
              ))}
            </div>
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-32 rounded-lg" />
              ))}
            </div>
            <Card>
              <Skeleton className="h-[300px]" />
            </Card>
          </div>
        )}

        {/* Results */}
        {walletData && !isScanning && (
          <div className="animate-fade-in">
            {/* Save wallet button */}
            {user && (
              <div className="flex justify-end mb-3">
                <Button
                  size="sm"
                  variant={walletSaved ? 'ghost' : 'outline'}
                  loading={savingWallet}
                  disabled={walletSaved}
                  onClick={handleSaveWallet}
                >
                  <Save className="w-3.5 h-3.5" />
                  {walletSaved ? 'Wallet Saved' : 'Save Wallet'}
                </Button>
              </div>
            )}

            <WalletOverview wallet={walletData} />

            {/* Position tabs with action buttons */}
            <PositionTabs
              positions={positions}
              selected={selectedPosition}
              onSelect={setSelectedPosition}
            />

            {/* Per-position action buttons */}
            {positions[selectedPosition] && (
              <>
                <div className="flex items-center gap-2 mb-3">
                  {user && (
                    <Button
                      size="sm"
                      variant={
                        watchlistAdded[positions[selectedPosition].tokenAddress]
                          ? 'ghost'
                          : 'outline'
                      }
                      disabled={watchlistAdded[positions[selectedPosition].tokenAddress]}
                      onClick={() =>
                        handleAddToWatchlist(
                          positions[selectedPosition].tokenAddress,
                          positions[selectedPosition].chain
                        )
                      }
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {watchlistAdded[positions[selectedPosition].tokenAddress]
                        ? 'On Watchlist'
                        : 'Add to Watchlist'}
                    </Button>
                  )}
                  <Link
                    href={`/token/${positions[selectedPosition].tokenAddress}?chain=${positions[selectedPosition].chain}`}
                  >
                    <Button size="sm" variant="ghost">
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Details
                    </Button>
                  </Link>
                </div>

                <TokenDetail
                  key={selectedPosition}
                  position={positions[selectedPosition]}
                />
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
