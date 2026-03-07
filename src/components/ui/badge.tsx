import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'chain'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
  chain?: 'SOL' | 'ETH' | 'BASE' | 'BSC'
}

const variantStyles: Record<Exclude<BadgeVariant, 'chain'>, string> = {
  default: 'bg-[#0c1424] text-text-secondary border-[#121e36]',
  success: 'bg-neon-green/5 text-neon-green border-neon-green/20 shadow-[0_0_6px_rgba(0,255,136,0.1)]',
  danger: 'bg-neon-red/5 text-neon-red border-neon-red/20 shadow-[0_0_6px_rgba(255,51,102,0.1)]',
  warning: 'bg-neon-yellow/5 text-neon-yellow border-neon-yellow/20 shadow-[0_0_6px_rgba(255,208,0,0.1)]',
  info: 'bg-neon-cyan/5 text-neon-cyan border-neon-cyan/20 shadow-[0_0_6px_rgba(0,229,255,0.1)]',
}

const chainStyles: Record<string, string> = {
  SOL: 'bg-neon-green/5 text-neon-green border-neon-green/20 shadow-[0_0_6px_rgba(0,255,136,0.1)]',
  ETH: 'bg-neon-cyan/5 text-neon-cyan border-neon-cyan/20 shadow-[0_0_6px_rgba(0,229,255,0.1)]',
  BASE: 'bg-neon-blue/5 text-neon-blue border-neon-blue/20 shadow-[0_0_6px_rgba(0,204,255,0.1)]',
  BSC: 'bg-neon-yellow/5 text-neon-yellow border-neon-yellow/20 shadow-[0_0_6px_rgba(255,208,0,0.1)]',
}

export function Badge({ variant = 'default', children, className, chain }: BadgeProps) {
  const styles = variant === 'chain' && chain
    ? chainStyles[chain] ?? variantStyles.default
    : variantStyles[variant === 'chain' ? 'default' : variant]

  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-mono uppercase border',
      styles,
      className
    )}>
      {variant === 'chain' && chain && <span className="mr-1">{chain}</span>}
      {children}
    </span>
  )
}
