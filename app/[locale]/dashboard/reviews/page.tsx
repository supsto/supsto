import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { RatingStars } from '@/components/domain/rating-stars'
import { PageHeader } from '@/components/layout/section'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/field'
import { Stat } from '@/components/ui/stat'
import { replyToReview } from '@/lib/actions/review'
import { requireCompany } from '@/lib/auth/panel'
import { createClient } from '@/lib/supabase/server'
import { formatRelative } from '@/lib/utils'

export const metadata: Metadata = { title: 'Değerlendirmeler', robots: { index: false } }

export default async function SupplierReviewsPage() {
  const [company, t] = await Promise.all([requireCompany(), getTranslations('reviews')])
  if (!company) return <Card><EmptyState title={t('title')} /></Card>

  const supabase = await createClient()
  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, author:profiles!reviews_author_id_fkey ( full_name )')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })

  return (
    <>
      <PageHeader title={t('title')} />

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <Stat
          label={t('overall')}
          value={company.rating_average ? company.rating_average.toFixed(1) : '—'}
        />
        <Stat label={t('title')} value={String(company.rating_count)} />
      </div>

      {reviews && reviews.length > 0 ? (
        <Card>
          <CardBody>
            <ul className="divide-y divide-line">
              {reviews.map((r) => {
                const author = r.author as { full_name: string | null } | null
                return (
                  <li key={r.id} className="py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <RatingStars rating={r.rating} />
                      <span className="text-[13px] font-bold">{author?.full_name ?? '—'}</span>
                      <time dateTime={r.created_at} className="text-[10px] text-faint">
                        {formatRelative(r.created_at)}
                      </time>
                    </div>
                    {r.comment ? (
                      <p className="mt-1.5 text-[13px] text-ink-soft">{r.comment}</p>
                    ) : null}

                    {r.reply ? (
                      <div className="mt-2 rounded-xl border-l-2 border-brand bg-surface-2 p-2.5">
                        <div className="text-[10px] font-bold text-brand">
                          {t('supplierReply')}
                        </div>
                        <p className="mt-0.5 text-xs">{r.reply}</p>
                      </div>
                    ) : (
                      <form action={replyToReview} className="mt-2 flex gap-2">
                        <input type="hidden" name="id" value={r.id} />
                        <Input
                          name="reply"
                          required
                          maxLength={1000}
                          placeholder={t('reply')}
                          aria-label={t('reply')}
                          className="flex-1"
                        />
                        <Button type="submit" size="sm" variant="primary">
                          {t('reply')}
                        </Button>
                      </form>
                    )}
                  </li>
                )
              })}
            </ul>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <EmptyState title={t('empty')} description={t('emptyBody')} />
        </Card>
      )}
    </>
  )
}
