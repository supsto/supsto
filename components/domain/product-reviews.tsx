import { getTranslations } from 'next-intl/server'

import { Badge } from '@/components/ui/badge'
import { Card, CardBody, CardHead } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import type { Review } from '@/lib/types'
import { formatRelative } from '@/lib/utils'
import { RatingStars } from './rating-stars'

type ReviewWithAuthor = Review & { author: { full_name: string | null } | null }

/**
 * Değerlendirmeler yalnızca tamamlanmış siparişten doğar; bu yüzden
 * her biri "doğrulanmış alım" rozetiyle gösterilir — rozet bir iddia
 * değil, veritabanı kısıtının sonucudur.
 */
export async function ProductReviews({
  reviews,
  average,
  count,
}: {
  reviews: ReviewWithAuthor[]
  average: number | null
  count: number
}) {
  const t = await getTranslations('reviews')

  return (
    <Card>
      <CardHead
        title={t('title')}
        subtitle={count > 0 ? t('count', { count }) : undefined}
        action={
          average ? (
            <div className="flex items-center gap-2">
              <RatingStars rating={average} />
              <span className="text-sm font-bold tabular-nums">{average.toFixed(1)}</span>
            </div>
          ) : undefined
        }
      />
      <CardBody className="pt-0">
        {reviews.length > 0 ? (
          <ul className="divide-y divide-line">
            {reviews.map((r) => (
              <li key={r.id} className="py-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <RatingStars rating={r.rating} />
                  <span className="text-[13px] font-bold">
                    {r.author?.full_name ?? '—'}
                  </span>
                  <Badge tone="success">{t('verifiedPurchase')}</Badge>
                  <time dateTime={r.created_at} className="text-[10px] text-faint">
                    {formatRelative(r.created_at)}
                  </time>
                </div>

                {r.comment ? (
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
                    {r.comment}
                  </p>
                ) : null}

                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
                  {r.quality_rating ? <span>{t('quality')}: {r.quality_rating}/5</span> : null}
                  {r.delivery_rating ? <span>{t('delivery')}: {r.delivery_rating}/5</span> : null}
                  {r.communication_rating ? (
                    <span>{t('communication')}: {r.communication_rating}/5</span>
                  ) : null}
                </div>

                {r.reply ? (
                  <div className="mt-2.5 rounded-xl border-l-2 border-brand bg-surface-2 p-2.5">
                    <div className="text-[10px] font-bold text-brand">{t('supplierReply')}</div>
                    <p className="mt-0.5 text-xs text-ink-soft">{r.reply}</p>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={t('empty')} description={t('emptyBody')} />
        )}
      </CardBody>
    </Card>
  )
}
