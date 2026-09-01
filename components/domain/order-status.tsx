import { getTranslations } from 'next-intl/server'

import { Badge, type Tone } from '@/components/ui/badge'
import { ORDER_FLOW } from '@/lib/types'
import { cn } from '@/lib/utils'

const TONES: Record<string, Tone> = {
  pending: 'warning',
  confirmed: 'brand',
  in_production: 'brand',
  shipped: 'brand',
  delivered: 'success',
  completed: 'success',
  cancelled: 'danger',
}

type Key = (typeof ORDER_FLOW)[number] | 'cancelled'

export async function OrderStatusBadge({ status }: { status: string }) {
  const t = await getTranslations('orders')
  const tone = TONES[status]
  if (!tone) return <Badge tone="neutral">{status}</Badge>
  return <Badge tone={tone}>{t(status as Key)}</Badge>
}

/** Durum makinesinin görsel karşılığı; iptal edilmiş siparişte gösterilmez. */
export async function OrderProgress({ status }: { status: string }) {
  const t = await getTranslations('orders')
  if (status === 'cancelled') return null

  const currentIndex = ORDER_FLOW.indexOf(status as (typeof ORDER_FLOW)[number])

  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2">
      {ORDER_FLOW.map((step, index) => {
        const done = index <= currentIndex
        return (
          <li key={step} className="flex items-center gap-1">
            <span
              className={cn(
                'rounded-pill px-2.5 py-1 text-[11px] font-bold',
                done ? 'bg-brand text-white' : 'bg-surface-2 text-muted'
              )}
              aria-current={index === currentIndex ? 'step' : undefined}
            >
              {t(step)}
            </span>
            {index < ORDER_FLOW.length - 1 ? (
              <span
                className={cn('h-px w-3', done ? 'bg-brand' : 'bg-line')}
                aria-hidden="true"
              />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
