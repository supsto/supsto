import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import type { Locale } from '@/i18n/routing'
import { alternates } from '@/lib/seo'
import { Link } from '@/i18n/navigation'
import { notFound } from 'next/navigation'

import { Container, PageHeader } from '@/components/layout/section'
import { Pagination } from '@/components/domain/pagination'
import { ProductCard } from '@/components/domain/product-card'
import { ButtonLink } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { getCategoryBySlug } from '@/lib/queries/categories'
import { searchProducts } from '@/lib/queries/products'
import { formatNumber } from '@/lib/utils'

const PAGE_SIZE = 24

export async function generateMetadata(
  props: PageProps<'/[locale]/category/[slug]'>
): Promise<Metadata> {
  const { slug, locale } = await props.params
  const [category, t] = await Promise.all([
    getCategoryBySlug(slug),
    getTranslations({ locale, namespace: 'category' }),
  ])
  if (!category) return { title: 'Kategori bulunamadı' }

  return {
    title: category.name,
    description: category.description ?? t('metaDescription', { name: category.name }),
    // Kategori slug'ı da çevrildiği için her dil KENDİ slug'ına işaret
    // etmeli; sabit slug hreflang'i var olmayan bir sayfaya bağlardı.
    alternates: await alternates(
      (l) => ({
        pathname: '/category/[slug]',
        params: { slug: category.translations[l].slug },
      }),
      locale as Locale
    ),
  }
}

export default async function CategoryPage(props: PageProps<'/[locale]/category/[slug]'>) {
  const { slug } = await props.params
  const sp = await props.searchParams
  const page = Math.max(1, Number(Array.isArray(sp.sayfa) ? sp.sayfa[0] : sp.sayfa) || 1)

  const [category, t, trfq] = await Promise.all([
    getCategoryBySlug(slug),
    getTranslations('category'),
    getTranslations('rfq'),
  ])
  if (!category) notFound()

  const categoryIds = [category.id, ...category.children.map((c) => c.id)]
  const { items, total } = await searchProducts({
    categoryIds,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  })

  return (
    <Container className="py-6">
      <PageHeader
        title={category.name}
        description={
          category.description ?? t('productsListed', { count: formatNumber(total) })
        }
        action={
          <ButtonLink href="/rfq/new" variant="primary">
            {t('createRfqHere')}
          </ButtonLink>
        }
      />

      {category.children.length > 0 ? (
        <div className="mb-5 flex flex-wrap gap-1.5">
          {category.children.map((child) => (
            <Link
              key={child.id}
              href={{ pathname: '/category/[slug]', params: { slug: child.slug } }}
              className="rounded-pill border border-line bg-surface px-3 py-2 text-xs font-semibold transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand"
            >
              {child.name}
            </Link>
          ))}
        </div>
      ) : null}

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
            baseParams={{}}
          />
        </>
      ) : (
        <Card>
          <EmptyState
            title={t('empty')}
            description={t('emptyBody')}
            action={
              <ButtonLink href="/rfq/new" variant="primary">
                {trfq('createNew')}
              </ButtonLink>
            }
          />
        </Card>
      )}
    </Container>
  )
}
