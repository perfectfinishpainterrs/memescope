import { GlitchText } from '@/components/effects/glitch-text'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { Shield, Wallet, Search, Bell } from 'lucide-react'

const features = [
  {
    icon: Wallet,
    title: 'Wallet Scanner',
    description: 'Deep-scan any Solana wallet. Track positions, PnL, and trading patterns in real time.',
  },
  {
    icon: Shield,
    title: 'Scam Detector',
    description: 'Multi-signal safety scoring. LP locks, mint authority, honeypot checks, deployer history.',
  },
  {
    icon: Search,
    title: 'Token Research',
    description: 'Full token profiles with holder distribution, liquidity depth, and social sentiment.',
  },
  {
    icon: Bell,
    title: 'Real-time Alerts',
    description: 'Get notified on whale moves, rug signals, KOL mentions, and price breakouts.',
  },
]

const steps = [
  { num: '01', label: 'Enter Address', desc: 'Paste any Solana wallet or token address' },
  { num: '02', label: 'Analyze', desc: 'AI-powered safety scoring and wallet profiling' },
  { num: '03', label: 'Decide', desc: 'Make informed trades with full transparency' },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-bg-deep">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 pt-32 pb-20">
        <GlitchText text="MEMESCOPE" className="text-5xl md:text-7xl mb-4" />
        <p className="font-mono text-neon-blue text-sm md:text-base tracking-widest uppercase mb-6">
          Solana Wallet Scanner + Scam Detector
        </p>
        <p className="text-text-secondary max-w-xl text-base md:text-lg mb-10">
          Research meme coins. Detect rugs. Track wallets. SOL-native intelligence.
        </p>
        <Link
          href="/scan"
          className="px-6 py-3 text-base font-mono font-semibold uppercase tracking-wider rounded-lg inline-flex items-center justify-center bg-neon-green text-[#030608] hover:brightness-110 shadow-[0_0_12px_rgba(0,255,136,0.3),0_0_30px_rgba(0,255,136,0.1)] hover:shadow-[0_0_18px_rgba(0,255,136,0.45),0_0_40px_rgba(0,255,136,0.15)] transition-all duration-200"
        >
          Start Scanning
        </Link>
      </section>

      {/* Features grid */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f) => (
            <Card key={f.title} notch glow className="group">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-neon-green/10 text-neon-green shrink-0">
                  <f.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-mono font-bold text-text-primary mb-1">{f.title}</h3>
                  <p className="text-text-secondary text-sm">{f.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <h2 className="font-mono font-bold text-2xl text-center text-text-primary mb-12">
          How it works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((s) => (
            <div key={s.num} className="text-center">
              <div className="w-12 h-12 rounded-full border-2 border-neon-green text-neon-green font-mono font-bold text-lg flex items-center justify-center mx-auto mb-4">
                {s.num}
              </div>
              <h3 className="font-mono font-bold text-text-primary mb-2">{s.label}</h3>
              <p className="text-text-secondary text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <footer className="border-t border-border py-16 text-center px-6">
        <p className="text-text-secondary mb-6 font-mono">Ready to ape responsibly?</p>
        <Link
          href="/scan"
          className="px-6 py-3 text-base font-mono font-semibold uppercase tracking-wider rounded-lg inline-flex items-center justify-center border border-neon-green/50 text-neon-green hover:bg-neon-green/10 hover:border-neon-green/80 hover:shadow-[0_0_12px_rgba(0,255,136,0.15)] transition-all duration-200"
        >
          Start Scanning
        </Link>
        <p className="text-text-dim text-xs mt-10 font-mono">
          &copy; {new Date().getFullYear()} MEMESCOPE. All rights reserved.
        </p>
      </footer>
    </main>
  )
}
