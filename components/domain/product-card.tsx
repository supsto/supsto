import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'

import { CompareToggle } from './compare-store'

import { Card } from '@/components/ui/card'
import { VerifiedBadge } from '@/components/ui/badge'
import { formatCurrency, formatNumber, cn } from '@/lib/utils'
import type { ProductListItem } from '@/lib/types'
import { ProductImage } from './product-image'
import { StockBadge } from './stock-badge'

/**
 * Katalog kartı.
 *
 * B2B alıcı fiyattan önce üç şeye bakar: kaç adetten başlıyor, ne zaman
 * teslim ediliyor, hangi teslim şekliyle. Bunlar karttan okunamazsa
 * alıcı her ürün için detaya girmek zorunda kalır.
 */
export async function ProductCard({
  product,
  priority,
  variant = 'grid',
}: {
  product: ProductListItem
  priority?: boolean
  variant?: 'grid' | 'list'
}) {
  const [t, tc] = await Promise.all([
    getTranslations('product'),
    getTranslations('catalog'),
  ])

  const list = variant === 'list'

  /*
    Kademeli fiyat kartta özetlenir: en düşük adet ve en iyi fiyat.
    Tüm kademeleri sığdırmaya çalışmak kartı okunmaz hale getiriyor,
    alıcının aradığı bilgi ise "hacim artarsa ne kazanırım".
  */
  const tiers = [...(product.price_tiers ?? [])].sort(
    (a, b) => a.min_quantity - b.min_quantity
  )
  const bestTier = tiers.length > 1 ? tiers[tiers.length - 1] : null

  const detailHref = {
    pathname: '/product/[slug]' as const,
    params: { slug: product.slug },
  }

  const chips = [
    product.incoterm,
    product.lead_time_days
      ? tc('leadTimeValue', { days: product.lead_time_days })
      : null,
    product.production_type ? tc(`production_${product.production_type}`) : null,
  ].filter(Boolean) as string[]

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-shadow hover:shadow-lift',
        list ? 'flex flex-col sm:flex-row' : 'flex flex-col'
      )}
    >
      <div className="absolute right-2 top-2 z-10">
        <CompareToggle productId={product.id} />
      </div>

      <Link
        href={detailHref}
        className={cn('flex flex-1', list ? 'flex-col sm:flex-row' : 'flex-col')}
      >
        <ProductImage
          src={product.images?.[0]}
          alt={product.title}
          priority={priority}
          sizes={
            list
              ? '(max-width: 640px) 100vw, 200px'
              : '(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 25vw'
          }
          className={cn(list ? 'h-40 w-full sm:w-[200px]' : 'h-44 w-full')}
        />

        <div className="flex flex-1 flex-col p-3.5">
          {product.category ? (
            <div className="text-[11px] text-muted">{product.category.name}</div>
          ) : null}

          <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug group-hover:text-brand">
            {product.title}
          </h3>

          <div className="mt-1 line-clamp-1 text-xs text-muted">
            {product.company?.name}
          </div>

          {chips.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-md bg-bg px-1.5 py-0.5 text-[10px] font-semibold text-muted ring-1 ring-line"
                >
                  {chip}
                </span>
              ))}
            </div>
          )}

          <div className="mt-auto pt-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-lg font-extrabold tabular-nums">
                {product.price_hidden
                  ? t('priceOnRequest')
                  : formatCurrency(product.price, product.currency)}
              </span>
              <StockBadge quantity={product.stock_quantity} />
            </div>

            {bestTier && !product.price_hidden ? (
              <div className="mt-1 text-[11px] font-semibold text-accent tabular-nums">
                {tc('tierFrom', { qty: formatNumber(bestTier.min_quantity) })}:{' '}
                {formatCurrency(bestTier.unit_price, bestTier.currency)}
              </div>
            ) : null}

            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted">
              <span>
                {t('moq')} {formatNumber(product.moq)} {product.unit}
              </span>
              {product.company?.city ? <span>{product.company.city}</span> : null}
              {product.company?.verified ? (
                <VerifiedBadge className="ml-auto origin-right scale-90" />
              ) : null}
            </div>
          </div>
        </div>
      </Link>

      {/*
        Aksiyonlar Link'in DIŞINDA durur: iç içe <a> geçersiz HTML üretir
        ve tarayıcılar bunu sessizce başka türlü çözer.
      */}
      <div
        className={cn(
          'flex gap-1.5 border-t border-line p-2.5',
          list && 'sm:w-[190px] sm:flex-col sm:border-l sm:border-t-0'
        )}
      >
        <Link
          href={{ pathname: '/rfq/new', query: { urun: product.slug } }}
          className="flex-1 rounded-lg bg-brand px-2 py-1.5 text-center text-[11px] font-bold text-white transition-colors hover:bg-brand-strong"
        >
          {t('requestQuote')}
        </Link>
        {product.sample_available ? (
          <Link
            href={detailHref}
            className="flex-1 rounded-lg px-2 py-1.5 text-center text-[11px] font-bold text-brand ring-1 ring-line transition-colors hover:bg-bg"
          >
            {t('requestSample')}
          </Link>
        ) : null}
      </div>
    </Card>
  )
}
