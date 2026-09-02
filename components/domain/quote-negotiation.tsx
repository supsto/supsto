'use client'

import { useTranslations } from 'next-intl'
import { useActionState, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHead } from '@/components/ui/card'
import { Field, Input, Textarea } from '@/components/ui/field'
import { FormMessage, SubmitButton } from '@/components/ui/form-status'
import { Notice } from '@/components/ui/notice'
import { addQuoteRevision } from '@/lib/actions/negotiation'
import { COMMON_INCOTERMS } from '@/lib/catalog'
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
  currentTerms,
  agreedAt,
}: {
  quoteId: string
  /** İzleyicinin rolü; null ise yalnızca okuma. */
  side: 'supplier' | 'buyer' | null
  revisions: QuoteRevision[]
  currency: string
  canNegotiate: boolean
  /** Yürürlükteki teklif: turların sonucunda oluşan anlaşma taslağı. */
  currentTerms: {
    price: number
    moq: number | null
    delivery_days: number | null
    incoterm: string | null
    advance_pct: number | null
    payment_days: number | null
    defect_tolerance_pct: number | null
  }
  /** Doluysa şartlar dondu; veritabanı tetiği de değişimi engelliyor. */
  agreedAt: string | null
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
        {/*
          Anlaşma taslağı: turların sonucunda yürürlükte olan şartlar.
          Tur listesi tarihçedir; alıcının imzalayacağı şey budur.
        */}
        <div
          className={cn(
            'mb-4 rounded-xl border p-3',
            agreedAt ? 'border-ok/40 bg-ok-soft/40' : 'border-line bg-surface-2'
          )}
        >
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted">
              {t('draftTitle')}
            </h3>
            {agreedAt ? (
              <span className="text-[11px] font-bold text-ok">
                {t('locked', { at: formatRelative(agreedAt) })}
              </span>
            ) : null}
          </div>
          <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-3">
            <Term label={t('price')} value={formatCurrency(currentTerms.price, currency)} strong />
            <Term
              label={t('moq')}
              value={currentTerms.moq ? formatNumber(currentTerms.moq) : null}
            />
            <Term
              label={t('deliveryDays')}
              value={currentTerms.delivery_days ? String(currentTerms.delivery_days) : null}
            />
            <Term label={t('incoterm')} value={currentTerms.incoterm} />
            <Term
              label={t('advance')}
              value={
                currentTerms.advance_pct != null ? `%${currentTerms.advance_pct}` : null
              }
            />
            <Term
              label={t('paymentDays')}
              value={
                currentTerms.payment_days != null ? String(currentTerms.payment_days) : null
              }
            />
            <Term
              label={t('defectTolerance')}
              value={
                currentTerms.defect_tolerance_pct != null
                  ? `%${currentTerms.defect_tolerance_pct}`
                  : null
              }
            />
          </dl>
          {!agreedAt ? (
            <p className="mt-2 text-[10px] leading-relaxed text-muted">
              {t('draftHint')}
            </p>
          ) : null}
        </div>

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
                  {r.incoterm ? (
                    <span className="text-muted">{r.incoterm}</span>
                  ) : null}
                  {r.advance_pct != null ? (
                    <span className="text-muted">
                      {t('advance')}: %{r.advance_pct}
                    </span>
                  ) : null}
                  {r.payment_days != null ? (
                    <span className="text-muted">
                      {t('paymentDays')}: {r.payment_days}
                    </span>
                  ) : null}
                  {r.defect_tolerance_pct != null ? (
                    <span className="text-muted">
                      {t('defectTolerance')}: %{r.defect_tolerance_pct}
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

            {/*
              B2B pazarlığı tek boyutlu değildir: fiyatta verilen taviz
              vadede geri alınır. Bu alanlar aynı formda durmazsa taraflar
              her parametre için ayrı tur açmak zorunda kalır.
            */}
            <Field label={t('incoterm')} htmlFor="rev_incoterm">
              <select
                id="rev_incoterm"
                name="incoterm"
                defaultValue=""
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
              >
                <option value="">{t('unchanged')}</option>
                {COMMON_INCOTERMS.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label={t('advance')}
              htmlFor="rev_advance"
              error={errors.advance_pct}
              hint={t('advanceHint')}
            >
              <Input
                id="rev_advance"
                name="advance_pct"
                type="number"
                min={0}
                max={100}
              />
            </Field>
            <Field
              label={t('paymentDays')}
              htmlFor="rev_payment_days"
              error={errors.payment_days}
            >
              <Input
                id="rev_payment_days"
                name="payment_days"
                type="number"
                min={0}
                max={365}
              />
            </Field>
            <Field
              label={t('defectTolerance')}
              htmlFor="rev_defect"
              error={errors.defect_tolerance_pct}
              hint={t('defectHint')}
            >
              <Input
                id="rev_defect"
                name="defect_tolerance_pct"
                type="number"
                min={0}
                max={100}
                step="0.1"
              />
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

/**
 * Anlaşılmamış parametre "—" ile gösterilir.
 *
 * Boş bırakmak, tarafın o şartı kabul ettiği izlenimini verir; oysa
 * konuşulmamış bir şart, anlaşmazlığın en sık çıktığı yerdir.
 */
function Term({
  label,
  value,
  strong,
}: {
  label: string
  value: string | null
  strong?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-line/60 pb-1">
      <dt className="text-[10px] uppercase tracking-wide text-muted">{label}</dt>
      <dd
        className={
          strong
            ? 'text-sm font-extrabold tabular-nums'
            : cn('text-xs font-semibold tabular-nums', !value && 'text-faint')
        }
      >
        {value ?? '—'}
      </dd>
    </div>
  )
}
