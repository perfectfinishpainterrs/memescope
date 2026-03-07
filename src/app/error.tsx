'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-deep">
      <div className="text-center space-y-6 px-6">
        <div
          className="glitch-text relative inline-block font-mono font-bold text-6xl text-neon-red"
          data-text="ERROR"
        >
          ERROR
        </div>
        <p className="font-mono text-text-secondary text-sm max-w-md mx-auto">
          {error.message || 'Something went wrong. The system encountered an unexpected error.'}
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-neon-red/10 border border-neon-red/30 rounded-lg text-neon-red font-mono text-sm font-semibold hover:bg-neon-red/20 transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-6 py-2.5 bg-bg-card border border-border rounded-lg text-text-secondary font-mono text-sm hover:text-text-primary transition-colors"
          >
            Back to Base
          </Link>
        </div>
      </div>
    </div>
  )
}
