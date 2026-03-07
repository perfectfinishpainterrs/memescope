'use client'
import { cn } from '@/lib/utils'

interface GlitchTextProps {
  text: string
  className?: string
  as?: 'h1' | 'h2' | 'h3' | 'span'
}

export function GlitchText({ text, className, as: Tag = 'h1' }: GlitchTextProps) {
  return (
    <Tag
      className={cn('glitch-text relative inline-block font-mono font-bold', className)}
      data-text={text}
    >
      {text}
    </Tag>
  )
}
