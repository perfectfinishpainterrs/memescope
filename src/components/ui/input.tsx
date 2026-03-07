import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  className?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'bg-bg-card border border-border rounded-lg px-4 py-2.5',
          'focus:border-neon-green focus:ring-1 focus:ring-neon-green/30 focus:outline-none',
          'text-text-primary placeholder:text-text-dim font-mono text-sm',
          'transition-colors w-full',
          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
