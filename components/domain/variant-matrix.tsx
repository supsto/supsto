'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { CONTAINERS, packingFor } from '@/lib/catalog'
import type { PriceTier, ProductVariant } from '@/lib/types'
import { formatCurrency, formatNumber } from '@/lib/utils'

/**
 * İki eksenli sipariş matrisi.
 *
 * Perakendeci 12 varyantı tek tek sepete eklemez; bir tabloda adetleri
 * girip toplamı görmek ister. Adet arttıkça hangi fiyat kademesine
 * geçtiği ve yükün kaç m³ tuttuğu aynı ekranda hesaplanır — ikisi de
 * siparişi verip vermeme kararını doğrudan değiştiren bilgiler.
 */
export function VariantMatrix({
  variants,
  axis1Name,
  axis2Name,
  tiers,
  basePrice,
  currency,
  unit,
  moq,
  packing,
  productSlug,
}: {
  variants: ProductVariant[]
  axis1Name: string | null
  axis2Name: string | null
  tiers: PriceTier[]
  basePrice: number | null
  /** Ürünün para birimi ve birimi; eski kayıtlarda boş olabilir. */
  currency: string | null
  unit: string | null
  moq: number
  packing: {
    unitsPerCase: number | null
    caseVolumeM3: number | null
    caseWeightKg: number | null
    casesPerPallet: number | null
  }
  productSlug: string
}) {
  const t = useTranslations('matrix')
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  // Eksen değerleri satır/sütun başlıklarını verir; sıra veritabanındaki
  // ekleme sırasını korur ki üretici kendi mantığını dayatabilsin.
  const { rows, cols, byCell } = useMemo(() => {
    const rowSet: string[] = []
    const colSet: string[] = []
    const map = new Map<string, ProductVariant>()
    for (const v of variants) {
      if (!rowSet.includes(v.axis1_value)) rowSet.push(v.axis1_value)
      const col = v.axis2_value ?? ''
      if (!colSet.includes(col)) colSet.push(col)
      map.set(`${v.axis1_value}|${col}`, v)
    }
    return { rows: rowSet, cols: colSet, byCell: map }
  }, [variants])

  const totalQty = Object.values(quantities).reduce((a, b) => a + b, 0)

  /*
    Geçerli kademe TOPLAM adede göre seçilir, hücre hücre değil. B2B
    fiyatlamanın özü budur: alıcı 12 varyanta böldüğü siparişin toplam
    hacminden fiyat kazanır.
  */
  const tier = useMemo(() => {
    const sorted = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity)
    let found: PriceTier | null = null
    for (const candidate of sorted) {
      const under =
        candidate.max_quantity == null || totalQty <= candidate.max_quantity
      if (totalQty >= candidate.min_quantity && under) found = candidate
    }
    return found
  }, [tiers, totalQty])

  const unitPrice = tier?.unit_price ?? basePrice
  // Kademe kendi para birimini taşır; yoksa ürünün, o da yoksa TRY.
  const activeCurrency = tier?.currency ?? currency ?? 'TRY'
  const totalValue = unitPrice != null ? unitPrice * totalQty : null
  const pack = packingFor(totalQty, packing)
  const belowMoq = totalQty > 0 && totalQty < moq

  function setCell(key: string, raw: string) {
    const n = Math.max(0, Math.floor(Number(raw) || 0))
    setQuantities((prev) => {
      const next = { ...prev }
      if (n > 0) next[key] = n
      else delete next[key]
      return next
    })
  }

  return (
    <section className="rounded-card border border-line bg-surface">
      <header className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-bold">{t('title')}</h2>
        <p className="mt-0.5 text-[11px] text-muted">{t('lead')}</p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-xs">
          <thead>
            <tr className="bg-bg">
              <th className="sticky left-0 z-10 bg-bg px-3 py-2 text-left font-bold">
                {axis1Name ?? t('variant')}
                {axis2Name ? ` \\ ${axis2Name}` : ''}
              </th>
              {cols.map((col) => (
                <th key={col} className="px-2 py-2 text-center font-bold">
                  {col || '—'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row} className="border-t border-line">
                <th className="sticky left-0 z-10 bg-surface px-3 py-2 text-left font-semibold">
                  {row}
                </th>
                {cols.map((col) => {
                  const key = `${row}|${col}`
                  const variant = byCell.get(key)
                  if (!variant) {
                    return (
                      <td key={col} className="px-2 py-2 text-center text-muted">
                        —
                      </td>
                    )
                  }
                  const entered = quantities[key] ?? 0
                  const overStock = entered > variant.stock_quantity
                  return (
                    <td key={col} className="px-1.5 py-1.5">
                      <input
                        type="number"
                        min={0}
                        max={variant.stock_quantity}
                        value={entered || ''}
                        onChange={(e) => setCell(key, e.target.value)}
                        aria-label={`${row} ${col}`}
                        className={`w-full rounded-lg border bg-surface px-2 py-1.5 text-center tabular-nums ${
                          overStock ? 'border-danger text-danger' : 'border-line'
                        }`}
                      />
                      <span className="mt-0.5 block text-center text-[9px] text-muted">
                        {formatNumber(variant.stock_quantity)}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-x-4 gap-y-2 border-t border-line px-4 py-3 sm:grid-cols-2">
        <Row
          label={t('totalQty')}
          value={`${formatNumber(totalQty)} ${unit ?? ''}`.trim()}
        />
        <Row
          label={t('unitPrice')}
          value={
            unitPrice != null
              ? formatCurrency(unitPrice, activeCurrency)
              : t('onRequest')
          }
        />
        <Row
          label={t('totalValue')}
          value={
            totalValue != null
              ? formatCurrency(totalValue, activeCurrency)
              : t('onRequest')
          }
          strong
        />
        {pack ? (
          <>
            <Row label={t('cases')} value={formatNumber(pack.cases)} />
            {pack.pallets != null && (
              <Row label={t('pallets')} value={formatNumber(pack.pallets)} />
            )}
            {pack.volumeM3 != null && (
              <Row label={t('volume')} value={`${pack.volumeM3.toFixed(2)} m³`} />
            )}
            {pack.weightKg != null && (
              <Row
                label={t('weight')}
                value={`${formatNumber(Math.round(pack.weightKg))} kg`}
              />
            )}
          </>
        ) : (
          totalQty > 0 && (
            <p className="col-span-full text-[11px] text-muted">
              {t('noPacking')}
            </p>
          )
        )}
      </div>

      {/*
        Konteyner doluluğu yalnızca hacim bilindiğinde gösterilir.
        Tahmini bir doluluk yüzdesi uydurmak, alıcının navlun bütçesini
        yanlış kurmasına yol açar.
      */}
      {pack?.volumeM3 ? (
        <div className="border-t border-line px-4 py-3">
          <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
            {t('containerFit')}
          </h3>
          <div className="flex flex-wrap gap-3 text-[11px]">
            {CONTAINERS.map((c) => {
              const ratio = pack.volumeM3! / c.usableM3
              return (
                <span key={c.code} className="tabular-nums">
                  <b>{c.code.toUpperCase()}</b>{' '}
                  <span
                    className={ratio > 1 ? 'text-accent' : 'text-muted'}
                  >
                    %{Math.round(ratio * 100)}
                  </span>
                  {ratio > 1 && (
                    <span className="text-muted">
                      {' '}
                      ({Math.ceil(ratio)} {t('containers')})
                    </span>
                  )}
                </span>
              )
            })}
          </div>
          <p className="mt-1 text-[10px] text-muted">{t('containerHint')}</p>
        </div>
      ) : null}

      <footer className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
        {belowMoq && (
          <p className="w-full text-[11px] font-semibold text-accent">
            {t('belowMoq', { moq: formatNumber(moq) })}
          </p>
        )}
        <Link
          href={{
            pathname: '/rfq/new',
            query: {
              urun: productSlug,
              ...(totalQty > 0 ? { adet: String(totalQty) } : {}),
            },
          }}
          className="rounded-lg bg-brand px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-strong"
        >
          {t('createRfq')}
        </Link>
        {totalQty > 0 && (
          <button
            type="button"
            onClick={() => setQuantities({})}
            className="text-[11px] font-semibold text-muted hover:text-fg"
          >
            {t('clear')}
          </button>
        )}
      </footer>
    </section>
  )
}

function Row({
  label,
  value,
  strong,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[11px] text-muted">{label}</span>
      <span
        className={`tabular-nums ${strong ? 'text-sm font-extrabold' : 'text-xs font-semibold'}`}
      >
        {value}
      </span>
    </div>
  )
}
