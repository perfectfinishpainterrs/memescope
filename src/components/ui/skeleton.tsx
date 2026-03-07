import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded h-4 w-full animate-neon-shimmer',
        className
      )}
      style={{
        background: 'linear-gradient(90deg, #0c1424 0%, #0c1424 35%, rgba(0,255,136,0.06) 50%, #0c1424 65%, #0c1424 100%)',
        backgroundSize: '200% 100%',
      }}
    />
  )
}
