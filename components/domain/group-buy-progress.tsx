import { getTranslations } from 'next-intl/server'

import { Badge, type Tone } from '@/components/ui/badge'
import { cn, formatNumber } from '@/lib/utils'

const TONE: Record<string, Tone> = {
  open: 'brand', reached: 'success', ordered: 'success',
  expired: 'neutral', cancelled: 'danger',
}

export async function GroupBuyStatus({ status }: { status: string }) {
  const t = await getTranslations('groupBuy')
  const tone = TONE[status]
  if (!tone) return <Badge tone="neutral">{status}</Badge>
  return <Badge tone={tone}>{t(status as 'open')}</Badge>
}

/** Havuzun ne kadar dolduğunu tek bakışta gösterir. */
export async function GroupBuyProgress({
  committed,
  target,
  unit,
  className,
}: {
  committed: number
  target: number
  unit: string | null
  className?: string
}) {
  const t = await getTranslations('groupBuy')
  const percent = Math.min(100, Math.round((committed / target) * 100))
  const reached = committed >= target

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-bold tabular-nums">
          {t('progress', {
            committed: formatNumber(committed),
            target: formatNumber(target),
            unit: unit ?? '',
          })}
        </span>
        <span className={cn('tabular-nums', reached ? 'text-success' : 'text-muted')}>
          %{percent}
        </span>
      </div>
      <div
        className="mt-1.5 h-2 overflow-hidden rounded-pill bg-surface-2"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn('h-full rounded-pill transition-all', reached ? 'bg-success' : 'bg-brand')}
          style={{ width: `${percent}%` }}
        />
      </div>
      {!reached ? (
        <p className="mt-1 text-[11px] text-muted">
          {t('remaining')}: {formatNumber(target - committed)} {unit}
        </p>
      ) : null}
    </div>
  )
}
