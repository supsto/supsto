'use client'

import { useTranslations } from 'next-intl'
import { useActionState, useState } from 'react'

import { RatingStars } from '@/components/domain/rating-stars'
import { Card, CardBody, CardHead } from '@/components/ui/card'
import { Field, Textarea } from '@/components/ui/field'
import { FormMessage, SubmitButton } from '@/components/ui/form-status'
import { Notice } from '@/components/ui/notice'
import { submitReview } from '@/lib/actions/review'
import { IDLE } from '@/lib/types'
import { cn } from '@/lib/utils'

const ASPECTS = ['quality_rating', 'delivery_rating', 'communication_rating'] as const

export function ReviewForm({ orderId }: { orderId: string }) {
  const t = useTranslations('reviews')
  const [state, action] = useActionState(submitReview, IDLE)
  const [rating, setRating] = useState(5)
  const errors = state.status === 'error' ? (state.fieldErrors ?? {}) : {}

  if (state.status === 'success') {
    return (
      <Card>
        <CardBody>
          <Notice tone="success">{t('title')} ✓</Notice>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      <CardHead title={t('writeReview')} />
      <CardBody className="pt-0">
        <form action={action} className="space-y-3">
          <FormMessage state={state} />
          <input type="hidden" name="order_id" value={orderId} />
          <input type="hidden" name="rating" value={rating} />

          <div>
            <span className="mb-1.5 block text-xs font-semibold text-ink-soft">
              {t('overall')}
            </span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-label={t('ratingLabel', { rating: n })}
                  aria-pressed={rating === n}
                  className={cn(
                    'rounded-field border px-2 py-1 transition-colors',
                    rating >= n ? 'border-warning bg-warning-soft' : 'border-line'
                  )}
                >
                  <RatingStars rating={rating >= n ? 5 : 0} className="[&>svg:not(:first-child)]:hidden" />
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {ASPECTS.map((aspect) => (
              <Field
                key={aspect}
                label={t(aspect.replace('_rating', '') as 'quality')}
                htmlFor={aspect}
              >
                <select
                  id={aspect}
                  name={aspect}
                  defaultValue="5"
                  className="w-full rounded-field border border-line bg-surface px-3 py-2 text-sm"
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </Field>
            ))}
          </div>

          <Field
            label={t('comment')}
            htmlFor="comment"
            hint={t('commentHint')}
            error={errors.comment}
          >
            <Textarea id="comment" name="comment" rows={4} minLength={10} maxLength={2000} />
          </Field>

          <SubmitButton>{t('submit')}</SubmitButton>
        </form>
      </CardBody>
    </Card>
  )
}
