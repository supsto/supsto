'use client'

import { useTranslations } from 'next-intl'
import { useActionState, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHead } from '@/components/ui/card'
import { Field, Input, Textarea } from '@/components/ui/field'
import { FormMessage, SubmitButton } from '@/components/ui/form-status'
import { Notice } from '@/components/ui/notice'
import { addQuoteRevision } from '@/lib/actions/negotiation'
import { IDLE, type QuoteRevision } from '@/lib/types'
import { cn, formatCurrency, formatNumber, formatRelative } from '@/lib/utils'

/**
 * Teklif üzerindeki pazarlık turları.
 *
 * Tedarikçinin turu yürürlükteki teklifi günceller; alıcının turu
 * yalnızca öneridir. Bu ayrım sunucu tarafında da uygulanır, arayüz
 * sadece bunu görünür kılar.
 */
export function QuoteNegotiation({
  quoteId,
  side,
  revisions,
  currency,
  canNegotiate,
}: {
  quoteId: string
  /** İzleyicinin rolü; null ise yalnızca okuma. */
  side: 'supplier' | 'buyer' | null
  revisions: QuoteRevision[]
  currency: string
  canNegotiate: boolean
}) {
  const t = useTranslations('negotiation')
  const [open, setOpen] = useState(false)
  const [state, action] = useActionState(addQuoteRevision, IDLE)
  const errors = state.status === 'error' ? (state.fieldErrors ?? {}) : {}

  return (
    <Card>
      <CardHead
        title={t('title')}
        subtitle={t('lead')}
        action={
          side && canNegotiate && !open ? (
            <Button type="button" size="sm" variant="primary" onClick={() => setOpen(true)}>
              {side === 'buyer' ? t('counterOffer') : t('reviseQuote')}
            </Button>
          ) : undefined
        }
      />
      <CardBody className="pt-0">
        {revisions.length > 0 ? (
          <ol className="mb-4 space-y-2.5">
            {revisions.map((r, index) => (
              <li
                key={r.id}
                className={cn(
                  'rounded-xl border p-3',
                  r.side === 'supplier'
                    ? 'border-brand/25 bg-brand-soft/40'
                    : 'border-line bg-surface-2'
                )}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[11px] font-bold text-muted">
                    {t('round', { n: index + 1 })} ·{' '}
                    {r.side === 'supplier' ? t('supplierSide') : t('buyerSide')}
                  </span>
                  <time dateTime={r.created_at} className="text-[10px] text-faint">
                    {formatRelative(r.created_at)}
                  </time>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                  <span className="font-bold tabular-nums">
                    {formatCurrency(r.price, r.currency)}
                  </span>
                  {r.moq ? (
                    <span className="text-muted">
                      {t('moq')}: {formatNumber(r.moq)}
                    </span>
                  ) : null}
                  {r.delivery_days ? (
                    <span className="text-muted">
                      {t('deliveryDays')}: {r.delivery_days}
                    </span>
                  ) : null}
                </div>
                {r.message ? (
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{r.message}</p>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mb-4 text-xs text-muted">{t('noRounds')}</p>
        )}

        {!canNegotiate ? (
          <Notice tone="neutral">{t('closedNotice')}</Notice>
        ) : open && side ? (
          <form action={action} className="grid gap-3 sm:grid-cols-3">
            <FormMessage state={state} />
            <input type="hidden" name="quote_id" value={quoteId} />
            <input type="hidden" name="side" value={side} />

            <Field
              label={`${t('price')} (${currency})`}
              htmlFor="rev_price"
              required
              error={errors.price}
            >
              <Input id="rev_price" name="price" type="number" min={0} step="0.01" required />
            </Field>
            <Field label={t('moq')} htmlFor="rev_moq">
              <Input id="rev_moq" name="moq" type="number" min={1} />
            </Field>
            <Field label={t('deliveryDays')} htmlFor="rev_days">
              <Input id="rev_days" name="delivery_days" type="number" min={1} max={365} />
            </Field>
            <Field label={t('message')} htmlFor="rev_msg" className="sm:col-span-3">
              <Textarea id="rev_msg" name="message" rows={2} maxLength={1000} />
            </Field>
            <div className="flex justify-end gap-2 sm:col-span-3">
              <Button type="button" onClick={() => setOpen(false)}>×</Button>
              <SubmitButton>{t('send')}</SubmitButton>
            </div>
          </form>
        ) : null}
      </CardBody>
    </Card>
  )
}
