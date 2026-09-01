'use client'

import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import { Card, CardBody, CardHead } from '@/components/ui/card'
import { Input } from '@/components/ui/field'
import { Notice } from '@/components/ui/notice'
import type { PriceTier } from '@/lib/types'
import { formatCurrency, formatNumber } from '@/lib/utils'

const VAT_RATE = 20

/**
 * Alıcılar bu hesabı bugün Excel'de yapıyor. Kademeli fiyatı miktara göre
 * kendisi seçer, koli/palet karşılığını gösterir.
 *
 * Navlun ve KDV TAHMİNİDİR ve öyle etiketlenir — kesin tutar teklifte
 * belirlenir; burada kesinmiş gibi göstermek yanıltıcı olurdu.
 */
export function CostCalculator({
  basePrice,
  currency,
  moq,
  unit,
  tiers,
  unitsPerCase,
  casesPerPallet,
}: {
  basePrice: number | null
  currency: string
  moq: number
  unit: string | null
  tiers: PriceTier[]
  unitsPerCase: number | null
  casesPerPallet: number | null
}) {
  const t = useTranslations('cost')
  const [quantity, setQuantity] = useState(moq)
  const [freight, setFreight] = useState(0)

  const unitPrice = useMemo(() => {
    // En yüksek eşiği geçen kademe geçerlidir.
    const match = [...tiers]
      .sort((a, b) => a.min_quantity - b.min_quantity)
      .filter(
        (tier) =>
          quantity >= tier.min_quantity &&
          (tier.max_quantity === null || quantity <= tier.max_quantity)
      )
      .at(-1)
    return match?.unit_price ?? basePrice ?? 0
  }, [quantity, tiers, basePrice])

  const subtotal = unitPrice * quantity
  const vat = (subtotal + freight) * (VAT_RATE / 100)
  const total = subtotal + freight + vat
  const belowMoq = quantity < moq

  const cases = unitsPerCase ? Math.ceil(quantity / unitsPerCase) : null
  const pallets = cases && casesPerPallet ? Math.ceil(cases / casesPerPallet) : null

  return (
    <Card>
      <CardHead title={t('calculator')} subtitle={t('hint')} />
      <CardBody className="pt-0">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ink-soft">
              {t('quantity')} ({unit})
            </span>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              aria-invalid={belowMoq}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ink-soft">{t('freight')}</span>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={freight}
              onChange={(e) => setFreight(Math.max(0, Number(e.target.value) || 0))}
            />
          </label>
        </div>

        {belowMoq ? (
          <Notice tone="warning" className="mt-3">
            {t('belowMoq', { moq: formatNumber(moq), unit: unit ?? '' })}
          </Notice>
        ) : null}

        <dl className="mt-4 space-y-2 text-[13px]">
          <Row label={t('unitPrice')} value={formatCurrency(unitPrice, currency)} />
          <Row label={t('subtotal')} value={formatCurrency(subtotal, currency)} />
          {freight > 0 ? (
            <Row label={t('freight')} value={formatCurrency(freight, currency)} />
          ) : null}
          <Row label={t('vat', { rate: VAT_RATE })} value={formatCurrency(vat, currency)} />
          <div className="flex items-baseline justify-between border-t border-line pt-2">
            <dt className="font-bold">{t('total')}</dt>
            <dd className="text-lg font-extrabold tabular-nums">
              {formatCurrency(total, currency)}
            </dd>
          </div>
          <Row
            label={t('perUnit')}
            value={formatCurrency(total / Math.max(quantity, 1), currency)}
            muted
          />
        </dl>

        {cases ? (
          <p className="mt-3 rounded-xl bg-surface-2 p-2.5 text-[11px] text-muted">
            <b>{t('packaging')}:</b> {t('cases', { cases: formatNumber(cases) })}
            {pallets ? ` · ${t('pallets', { pallets: formatNumber(pallets) })}` : ''}
          </p>
        ) : null}
      </CardBody>
    </Card>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={muted ? 'tabular-nums text-muted' : 'font-semibold tabular-nums'}>
        {value}
      </dd>
    </div>
  )
}
