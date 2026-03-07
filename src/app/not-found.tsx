import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-deep">
      <div className="text-center space-y-6 px-6">
        <div
          className="glitch-text relative inline-block font-mono font-bold text-8xl text-neon-red"
          data-text="404"
        >
          404
        </div>
        <p className="font-mono text-text-secondary text-lg">
          Page not found
        </p>
        <p className="font-mono text-text-dim text-sm max-w-sm mx-auto">
          The signal was lost in the noise. This page doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block px-8 py-3 bg-neon-green/10 border border-neon-green/30 rounded-lg text-neon-green font-mono text-sm font-semibold hover:bg-neon-green/20 transition-colors"
        >
          Back to Base
        </Link>
      </div>
    </div>
  )
}
