import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import type { Locale } from '@/i18n/routing'
import { Link } from '@/i18n/navigation'
import { alternates } from '@/lib/seo'

import { Container, PageHeader } from '@/components/layout/section'
import { CatalogFilters } from '@/components/domain/catalog-filters'
import { Pagination } from '@/components/domain/pagination'
import { ProductCard } from '@/components/domain/product-card'
import { ButtonLink } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { getCompanyCities } from '@/lib/queries/companies'
import { getCategoryTree } from '@/lib/queries/categories'
import { searchProducts } from '@/lib/queries/products'
import {
  CERTIFICATE_KINDS,
  INCOTERMS,
  PRODUCTION_TYPES,
  parseMulti,
  parsePositive,
} from '@/lib/catalog'
import { cn, formatNumber } from '@/lib/utils'

export async function generateMetadata(
  props: PageProps<'/[locale]/search'>
): Promise<Metadata> {
  const { locale } = await props.params
  return {
    title: 'Ürün arama',
    description:
      'MOQ, birim fiyat, termin, Incoterms ve sertifikaya göre B2B ürün ve tedarikçi arayın.',
    alternates: await alternates('/search', locale as Locale),
  }
}

const PAGE_SIZE = 24

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

const SORT_MAP = {
  ucuz: 'price-asc',
  pahali: 'price-desc',
  kapasite: 'capacity',
} as const

export default async function SearchPage(props: PageProps<'/[locale]/search'>) {
  const sp = await props.searchParams
  const q = first(sp.q) ?? ''
  const categorySlug = first(sp.kategori) ?? ''
  const city = first(sp.sehir) ?? ''
  const sort = first(sp.sirala) ?? ''
  const verified = first(sp.dogrulanmis) === '1'
  const inStock = first(sp.stokta) === '1'
  const view = first(sp.gorunum) === 'liste' ? 'list' : 'grid'
  const page = Math.max(1, Number(first(sp.sayfa) ?? 1) || 1)

  const [tree, cities, t, tc, tcat, trfq] = await Promise.all([
    getCategoryTree(),
    getCompanyCities(),
    getTranslations('list'),
    getTranslations('common'),
    getTranslations('catalog'),
    getTranslations('rfq'),
  ])

  // Kök kategori seçilirse alt kategorileri de kapsa.
  const selected = tree.find((c) => c.slug === categorySlug)
  const categoryIds = selected
    ? [selected.id, ...selected.children.map((c) => c.id)]
    : undefined

  const { items, total } = await searchProducts({
    q,
    categoryIds,
    city: city || undefined,
    verifiedOnly: verified,
    inStock,
    maxMoq: parsePositive(first(sp.moq)),
    minPrice: parsePositive(first(sp.fiyat_min)),
    maxPrice: parsePositive(first(sp.fiyat_max)),
    maxLeadTime: parsePositive(first(sp.termin)),
    incoterms: parseMulti(first(sp.incoterm), INCOTERMS),
    productionTypes: parseMulti(first(sp.uretim), PRODUCTION_TYPES),
    certificates: parseMulti(first(sp.sertifika), CERTIFICATE_KINDS),
    sort: SORT_MAP[sort as keyof typeof SORT_MAP] ?? 'newest',
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  })

  // Sayfalama bağlantıları tüm aktif filtreleri korumalı.
  const baseParams = Object.fromEntries(
    Object.entries(sp)
      .map(([k, v]) => [k, first(v) ?? ''])
      .filter(([k, v]) => v && k !== 'sayfa')
  ) as Record<string, string>

  const viewHref = (mode: 'grid' | 'list') => ({
    pathname: '/search' as const,
    query: { ...baseParams, gorunum: mode === 'list' ? 'liste' : 'izgara' },
  })

  return (
    <Container className="py-6">
      <PageHeader
        title={q ? t('resultsFor', { q }) : t('products')}
        description={t('productsFound', { count: formatNumber(total) })}
      />

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <CatalogFilters cities={cities} />

        <div className="min-w-0 flex-1">
          {/* ---------- Görünüm ve sıralama ---------- */}
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-card border border-line bg-surface px-3 py-2">
            <div className="flex items-center gap-1">
              {(['grid', 'list'] as const).map((mode) => (
                <Link
                  key={mode}
                  href={viewHref(mode)}
                  aria-current={view === mode ? 'true' : undefined}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors',
                    view === mode
                      ? 'bg-brand text-white'
                      : 'text-muted hover:bg-bg'
                  )}
                >
                  {mode === 'grid' ? tcat('viewGrid') : tcat('viewList')}
                </Link>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-[11px] text-muted">{tc('sort')}</span>
              {(
                [
                  ['', tcat('sortSmart')],
                  ['ucuz', t('sortPriceAsc')],
                  ['pahali', t('sortPriceDesc')],
                  ['kapasite', tcat('sortCapacity')],
                ] as const
              ).map(([value, label]) => (
                <Link
                  key={value || 'smart'}
                  href={{
                    pathname: '/search',
                    query: (() => {
                      const next = { ...baseParams }
                      if (value) next.sirala = value
                      else delete next.sirala
                      return next
                    })(),
                  }}
                  aria-current={sort === value ? 'true' : undefined}
                  className={cn(
                    'rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors',
                    sort === value
                      ? 'bg-bg text-fg ring-1 ring-line'
                      : 'text-muted hover:text-fg'
                  )}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {items.length > 0 ? (
            <>
              <div
                className={cn(
                  view === 'list'
                    ? 'flex flex-col gap-3'
                    : 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3'
                )}
              >
                {items.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    priority={index < 4}
                    variant={view}
                  />
                ))}
              </div>
              <Pagination
                total={total}
                pageSize={PAGE_SIZE}
                currentPage={page}
                baseParams={baseParams}
              />
            </>
          ) : (
            <Card>
              <EmptyState
                title={t('noResults')}
                description={t('noResultsBody')}
                action={
                  <>
                    <ButtonLink href="/search">{tc('clearFilters')}</ButtonLink>
                    <ButtonLink href="/rfq/new" variant="primary">
                      {trfq('createNew')}
                    </ButtonLink>
                  </>
                }
              />
            </Card>
          )}
        </div>
      </div>
    </Container>
  )
}
