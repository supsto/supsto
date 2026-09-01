import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'


import type { Locale } from '@/i18n/routing'
import { alternates } from '@/lib/seo'

import { Container, PageHeader } from '@/components/layout/section'
import { FilterBar } from '@/components/domain/filter-bar'
import { Pagination } from '@/components/domain/pagination'
import { ProductCard } from '@/components/domain/product-card'
import { ButtonLink } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { getCompanyCities } from '@/lib/queries/companies'
import { getCategoryTree } from '@/lib/queries/categories'
import { searchProducts } from '@/lib/queries/products'
import { formatNumber } from '@/lib/utils'

export async function generateMetadata(
  props: PageProps<'/[locale]/search'>
): Promise<Metadata> {
  const { locale } = await props.params
  return {
  title: 'Ürün arama',
  description: 'Stok, MOQ, fiyat ve lokasyona göre B2B ürün ve tedarikçi arayın.',
    alternates: alternates('/search', locale as Locale),
  }
}

const PAGE_SIZE = 24

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function SearchPage(props: PageProps<'/[locale]/search'>) {
  const sp = await props.searchParams
  const q = first(sp.q) ?? ''
  const categorySlug = first(sp.kategori) ?? ''
  const city = first(sp.sehir) ?? ''
  const sort = first(sp.sirala) ?? ''
  const verified = first(sp.dogrulanmis) === '1'
  const page = Math.max(1, Number(first(sp.sayfa) ?? 1) || 1)

  const [tree, cities, t, tc, trfq] = await Promise.all([
    getCategoryTree(),
    getCompanyCities(),
    getTranslations('list'),
    getTranslations('common'),
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
    sort: sort === 'ucuz' ? 'price-asc' : sort === 'pahali' ? 'price-desc' : 'newest',
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  })

  const baseParams = Object.fromEntries(
    Object.entries({
      q,
      kategori: categorySlug,
      sehir: city,
      sirala: sort,
      dogrulanmis: verified ? '1' : '',
    }).filter(([, v]) => v)
  )

  return (
    <Container className="py-6">
      <PageHeader
        title={q ? t('resultsFor', { q }) : t('products')}
        description={t('productsFound', { count: formatNumber(total) })}
      />

      <FilterBar
        filters={[
          { name: 'q', placeholder: t('searchProducts'), type: 'text' },
          {
            name: 'kategori',
            placeholder: tc('allCategories'),
            options: tree.map((c) => ({ value: c.slug, label: c.name })),
          },
          {
            name: 'sehir',
            placeholder: tc('allCities'),
            options: cities.map((c) => ({ value: c, label: c })),
          },
          {
            name: 'dogrulanmis',
            placeholder: tc('supplierStatus'),
            options: [{ value: '1', label: tc('verifiedOnly') }],
          },
          {
            name: 'sirala',
            placeholder: t('sortNewest'),
            options: [
              { value: 'ucuz', label: t('sortPriceAsc') },
              { value: 'pahali', label: t('sortPriceDesc') },
            ],
          },
        ]}
      />

      {items.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {items.map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index < 4} />
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
    </Container>
  )
}
