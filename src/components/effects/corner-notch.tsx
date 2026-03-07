import { cn } from '@/lib/utils'

interface CornerNotchProps {
  children: React.ReactNode
  className?: string
  glow?: boolean
}

export function CornerNotch({ children, className, glow }: CornerNotchProps) {
  return (
    <div className={cn(
      'relative',
      'before:absolute before:top-0 before:left-0 before:w-2 before:h-2 before:border-t before:border-l before:border-neon-green',
      'after:absolute after:top-0 after:right-0 after:w-2 after:h-2 after:border-t after:border-r after:border-neon-green',
      glow && 'shadow-[0_0_15px_rgba(0,255,136,0.1)]',
      className
    )}>
      <div className={cn(
        'before:absolute before:bottom-0 before:left-0 before:w-2 before:h-2 before:border-b before:border-l before:border-neon-green',
        'after:absolute after:bottom-0 after:right-0 after:w-2 after:h-2 after:border-b after:border-r after:border-neon-green',
        'relative'
      )}>
        {children}
      </div>
    </div>
  )
}
