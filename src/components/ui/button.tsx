'use client'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'ghost' | 'outline' | 'cyber'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const variantStyles = {
  primary: 'bg-neon-green text-[#030608] hover:brightness-110 shadow-[0_0_12px_rgba(0,255,136,0.3),0_0_30px_rgba(0,255,136,0.1)] hover:shadow-[0_0_18px_rgba(0,255,136,0.45),0_0_40px_rgba(0,255,136,0.15)]',
  danger: 'bg-neon-red text-white hover:brightness-110 shadow-[0_0_12px_rgba(255,51,102,0.3)] hover:shadow-[0_0_18px_rgba(255,51,102,0.45)]',
  ghost: 'bg-transparent text-text-secondary hover:bg-bg-hover hover:text-text-primary',
  outline: 'border border-neon-green/50 text-neon-green hover:bg-neon-green/10 hover:border-neon-green/80 hover:shadow-[0_0_12px_rgba(0,255,136,0.15)] animate-border-glow',
  cyber: 'bg-[#070d18] text-neon-green border border-neon-green/40 hover:border-neon-green/70 hover:shadow-[0_0_15px_rgba(0,255,136,0.2),0_0_30px_rgba(0,255,136,0.05)] hover:bg-neon-green/5 [clip-path:polygon(0_4px,4px_0,calc(100%-4px)_0,100%_4px,100%_calc(100%-4px),calc(100%-4px)_100%,4px_100%,0_calc(100%-4px))]',
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        'font-mono font-semibold uppercase tracking-wider transition-all duration-200 rounded-lg inline-flex items-center justify-center gap-2',
        variantStyles[variant],
        variant === 'cyber' && 'rounded-none',
        sizeStyles[size],
        (disabled || loading) && 'opacity-50 cursor-not-allowed !shadow-none',
        className
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
}
