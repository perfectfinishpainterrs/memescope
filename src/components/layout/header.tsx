'use client'

import { APP_CONFIG } from '@/config'
import { cn, shortenAddress } from '@/lib/utils'
import { createSupabaseBrowser } from '@/lib/db/supabase-browser'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu, X, Wallet } from 'lucide-react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import type { User } from '@supabase/supabase-js'

const navLinks = [
  { href: '/scan', label: 'Scan' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/alerts', label: 'Alerts' },
]

export function Header() {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const { publicKey, disconnect, connected } = useWallet()
  const { setVisible } = useWalletModal()

  useEffect(() => {
    const supabase = createSupabaseBrowser()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    const supabase = createSupabaseBrowser()
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <header className="relative sticky top-0 z-50">
      <div className="flex items-center justify-between px-7 py-3.5 bg-[#030608]/95 backdrop-blur-xl border-b border-[#121e36]">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-neon-green via-neon-cyan to-neon-green flex items-center justify-center text-sm font-black text-[#030608] font-mono shadow-[0_0_20px_rgba(0,255,136,0.35),0_0_40px_rgba(0,255,136,0.1)] group-hover:shadow-[0_0_25px_rgba(0,255,136,0.5),0_0_50px_rgba(0,255,136,0.15)] transition-shadow duration-300">
              ◎
            </div>
            <div>
              <div className="font-mono font-bold text-lg bg-gradient-to-r from-neon-green to-neon-cyan bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(0,255,136,0.3)]">
                {APP_CONFIG.name}
              </div>
              <div className="text-[10px] text-text-dim font-mono tracking-widest uppercase">
                {APP_CONFIG.tagline}
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-3 py-1.5 text-sm font-mono transition-all duration-200',
                  pathname === link.href
                    ? 'text-neon-green border border-neon-green/30 bg-neon-green/5 shadow-[0_0_10px_rgba(0,255,136,0.1),inset_0_0_10px_rgba(0,255,136,0.03)]'
                    : 'text-text-secondary border border-transparent hover:text-text-primary hover:border-[#1a2f55] hover:bg-[#0f1a30]'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: LIVE + Auth + Mobile menu */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[10px] font-mono text-neon-green uppercase tracking-widest">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-neon-green shadow-[0_0_8px_#00ff88,0_0_16px_rgba(0,255,136,0.4)] animate-pulse-dot" />
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-neon-green/30 animate-ping" />
            </div>
            <span className="text-glow-green">LIVE</span>
          </div>

          {/* Wallet Connect (desktop) */}
          <div className="hidden md:flex items-center gap-3">
            {connected && publicKey ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 border border-neon-green/30 bg-neon-green/5 rounded">
                  <Wallet className="w-3 h-3 text-neon-green" />
                  <span className="text-xs font-mono text-neon-green">
                    {shortenAddress(publicKey.toBase58(), 4)}
                  </span>
                </div>
                <button
                  onClick={() => disconnect()}
                  className="text-[10px] font-mono text-text-dim hover:text-neon-red transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => setVisible(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-text-secondary border border-[#1a2f55] hover:text-neon-green hover:border-neon-green/30 hover:bg-neon-green/5 transition-all rounded"
              >
                <Wallet className="w-3.5 h-3.5" />
                Connect Wallet
              </button>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-text-secondary hover:text-text-primary transition-colors"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="absolute top-full left-0 right-0 bg-[#030608]/98 backdrop-blur-xl border-b border-[#121e36] p-4 md:hidden animate-fade-in">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    'px-3 py-2 text-sm font-mono transition-all duration-200',
                    pathname === link.href
                      ? 'text-neon-green border border-neon-green/30 bg-neon-green/5 shadow-[0_0_10px_rgba(0,255,136,0.1)]'
                      : 'text-text-secondary border border-transparent hover:text-text-primary hover:border-[#1a2f55] hover:bg-[#0f1a30]'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="mt-3 pt-3 border-t border-[#121e36]">
              {connected && publicKey ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Wallet className="w-3 h-3 text-neon-green" />
                    <span className="text-xs font-mono text-neon-green">
                      {shortenAddress(publicKey.toBase58(), 4)}
                    </span>
                  </div>
                  <button
                    onClick={() => { disconnect(); setMenuOpen(false) }}
                    className="text-xs font-mono text-text-dim hover:text-neon-red transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setVisible(true); setMenuOpen(false) }}
                  className="flex items-center gap-1.5 text-sm font-mono text-text-secondary hover:text-neon-green transition-colors"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Neon line under header */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-neon-green/40 to-transparent shadow-[0_1px_8px_rgba(0,255,136,0.15)]" />
    </header>
  )
}
