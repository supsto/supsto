import { Link } from '@/i18n/navigation'

import { getTranslations } from 'next-intl/server'

import { CompareToggle } from './compare-store'

import { Card } from '@/components/ui/card'
import { VerifiedBadge } from '@/components/ui/badge'
import { formatCurrency, formatNumber } from '@/lib/utils'
import type { ProductListItem } from '@/lib/types'
import { ProductImage } from './product-image'
import { StockBadge } from './stock-badge'

export async function ProductCard({
  product,
  priority,
}: {
  product: ProductListItem
  priority?: boolean
}) {
  const t = await getTranslations('product')

  return (
    <Card className="group relative flex flex-col overflow-hidden transition-shadow hover:shadow-lift">
      <div className="absolute right-2 top-2 z-10">
        <CompareToggle productId={product.id} />
      </div>
      <Link href={{ pathname: '/product/[slug]', params: { slug: product.slug } }} className="flex flex-1 flex-col">
        <ProductImage
          src={product.images?.[0]}
          alt={product.title}
          priority={priority}
          sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 25vw"
          className="h-44 w-full"
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

          <div className="mt-auto pt-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-lg font-extrabold tabular-nums">
                {product.price_hidden
                  ? t('priceOnRequest')
                  : formatCurrency(product.price, product.currency)}
              </span>
              <StockBadge quantity={product.stock_quantity} />
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted">
              <span>{t('moq')} {formatNumber(product.moq)} {product.unit}</span>
              <span>{t('stock')} {formatNumber(product.stock_quantity)}</span>
              {product.company?.city ? <span>{product.company.city}</span> : null}
              {product.company?.verified ? (
                <VerifiedBadge className="ml-auto scale-90 origin-right" />
              ) : null}
            </div>
          </div>
        </div>
      </Link>
    </Card>
  )
}
