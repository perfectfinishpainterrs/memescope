import { cn } from '@/lib/utils'
import { CornerNotch } from '@/components/effects/corner-notch'

interface CardProps {
  className?: string
  children: React.ReactNode
  notch?: boolean
  glow?: boolean
  variant?: 'default' | 'highlighted' | 'danger'
}

const variantStyles = {
  default: 'border-[#121e36] hover:border-[rgba(0,255,136,0.25)] hover:shadow-[0_0_20px_rgba(0,255,136,0.06),0_0_40px_rgba(0,255,136,0.02)]',
  highlighted: 'border-[rgba(0,255,136,0.2)] shadow-[0_0_15px_rgba(0,255,136,0.06),0_0_30px_rgba(0,255,136,0.03)] hover:border-[rgba(0,255,136,0.35)] hover:shadow-[0_0_20px_rgba(0,255,136,0.1),0_0_45px_rgba(0,255,136,0.04)]',
  danger: 'border-[rgba(255,51,102,0.2)] shadow-[0_0_15px_rgba(255,51,102,0.06)] hover:border-[rgba(255,51,102,0.35)] hover:shadow-[0_0_20px_rgba(255,51,102,0.1)]',
}

export function Card({ className, children, notch, glow, variant = 'default' }: CardProps) {
  const content = (
    <div className={cn(
      'bg-[#070d18] border rounded-lg p-4 transition-all duration-300',
      variantStyles[variant],
      glow && 'hover:border-[rgba(0,255,136,0.3)] hover:shadow-[0_0_25px_rgba(0,255,136,0.08),0_0_50px_rgba(0,255,136,0.03)]',
      className
    )}>
      {children}
    </div>
  )

  if (notch) {
    return <CornerNotch glow={glow}>{content}</CornerNotch>
  }

  return content
}
