import { getTranslations } from 'next-intl/server'

import { formatCurrency, formatNumber } from '@/lib/utils'

export interface TickerItem {
  label: string
  value: string
}

/**
 * Platform veri bandı.
 *
 * Yalnızca KENDİ veritabanımızdan gelen, doğrulanabilir sayıları
 * gösterir. Emtia/navlun gibi dış piyasa verileri için beslememiz yok;
 * uydurma rakam göstermek alıcının satın alma kararını yanlış
 * bilgiyle etkiler, o yüzden hiç gösterilmiyor.
 *
 * Değeri sıfır olan kalemler atlanır — "0 işlem" bandı hem çirkin hem
 * gereksiz.
 */
export async function MarketTicker({ items }: { items: TickerItem[] }) {
  const t = await getTranslations('ticker')
  if (items.length === 0) return null

  return (
    <div className="border-y border-white/10 bg-primary text-primary-ink">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 overflow-x-auto px-4 py-2.5 md:px-6 no-scrollbar">
        <span className="shrink-0 rounded-pill bg-brand/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-tint">
          {t('label')}
        </span>
        <ul className="flex items-center gap-6 whitespace-nowrap text-[11px]">
          {items.map((item) => (
            <li key={item.label} className="flex items-baseline gap-1.5">
              <span className="text-primary-muted">{item.label}</span>
              <b className="font-semibold tabular-nums text-white">{item.value}</b>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/** Sunucu tarafında bandın kalemlerini üretir. */
export async function buildTickerItems(input: {
  verifiedCompanies: number
  products: number
  openRfqs: number
  quotesLast7Days: number
  completedVolume: { amount: number; currency: string } | null
  cities: number
  openPools: number
}): Promise<TickerItem[]> {
  const t = await getTranslations('ticker')

  const raw: [string, number | string | null][] = [
    [t('verified'), input.verifiedCompanies],
    [t('products'), input.products],
    [t('openRfqs'), input.openRfqs],
    [t('quotes24'), input.quotesLast7Days],
    [t('poolsOpen'), input.openPools],
    [t('cities'), input.cities],
    [
      t('orderVolume'),
      input.completedVolume
        ? formatCurrency(input.completedVolume.amount, input.completedVolume.currency)
        : null,
    ],
  ]

  return raw
    .filter(([, v]) => v !== null && v !== 0)
    .map(([label, v]) => ({
      label,
      value: typeof v === 'number' ? formatNumber(v) : String(v),
    }))
}
