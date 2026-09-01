import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import type { Tone } from './badge'

const TONES: Record<Tone, string> = {
  brand: 'bg-brand-soft text-brand-dark',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-surface-2 text-ink-soft',
}

export function Notice({
  tone = 'brand',
  className,
  children,
}: {
  tone?: Tone
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn('rounded-xl px-3.5 py-3 text-xs leading-relaxed', TONES[tone], className)}
    >
      {children}
    </div>
  )
}
