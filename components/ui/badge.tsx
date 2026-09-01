import { getTranslations } from 'next-intl/server'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export type Tone = 'brand' | 'success' | 'warning' | 'danger' | 'neutral' | 'info'

/*
  Ton seçimi anlamı taşır:
    brand   → devam eden/olumlu durum (yeşil)
    success → onaylanmış işlem, doğrulama (koyu yeşil)
    warning → açık teklif, pazarlık, kritik stok (amber)
    info    → nötr kurumsal bilgi (koyu mavi)
*/
const TONES: Record<Tone, string> = {
  brand: 'bg-brand-soft text-brand-dark',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-primary-soft text-primary',
  neutral: 'bg-surface-2 text-muted',
}

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: ComponentProps<'span'> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill px-2 py-1 text-[11px] font-bold leading-none',
        TONES[tone],
        className
      )}
      {...props}
    />
  )
}

/** Saha doğrulama rozeti — sitede tek bir yerden gelsin diye ayrı bileşen. */
export async function VerifiedBadge({ className }: { className?: string }) {
  const t = await getTranslations('common')

  return (
    <Badge tone="success" className={className}>
      <svg viewBox="0 0 16 16" className="size-3 shrink-0" aria-hidden="true">
        <path
          fill="currentColor"
          d="M8 .8 9.9 2.4l2.5-.2.5 2.4 2.1 1.3-1.1 2.2 1.1 2.2-2.1 1.3-.5 2.4-2.5-.2L8 15.2l-1.9-1.6-2.5.2-.5-2.4L1 10.1l1.1-2.2L1 5.7l2.1-1.3.5-2.4 2.5.2L8 .8Zm-.8 9.9 3.9-3.9-1.1-1.1-2.8 2.8-1.2-1.2-1.1 1.1 2.3 2.3Z"
        />
      </svg>
      {t('verified')}
    </Badge>
  )
}
