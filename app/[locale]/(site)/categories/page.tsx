import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'


import type { Locale } from '@/i18n/routing'
import { alternates } from '@/lib/seo'
import { Link } from '@/i18n/navigation'

import { Container, PageHeader } from '@/components/layout/section'
import { categoryImage } from '@/components/domain/category-tile'
import { getCategoryCounts, getCategoryTree } from '@/lib/queries/categories'
import { formatNumber } from '@/lib/utils'

export async function generateMetadata(
  props: PageProps<'/[locale]/categories'>
): Promise<Metadata> {
  const { locale } = await props.params
  return {
  title: 'Kategoriler',
  description: 'Supsto ürün kategorileri ve alt kategorileri.',
    alternates: await alternates('/categories', locale as Locale),
  }
}

export default async function CategoriesPage() {
  const [tree, counts, t] = await Promise.all([
    getCategoryTree(),
    getCategoryCounts(),
    getTranslations('category'),
  ])

  return (
    <Container className="py-6">
      <PageHeader
        title={t('treeTitle')}
        description={t('treeLead')}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tree.map((category) => {
          const total = [category.id, ...category.children.map((c) => c.id)].reduce(
            (sum, id) => sum + (counts.get(id) ?? 0),
            0
          )

          return (
            <div
              key={category.id}
              className="overflow-hidden rounded-card border border-line bg-surface shadow-card"
            >
              <Link
                href={{ pathname: '/category/[slug]', params: { slug: category.slug } }}
                className="group flex items-center gap-3 border-b border-line p-4"
              >
                <span
                  className="size-11 shrink-0 rounded-xl bg-cover bg-center ring-1 ring-line"
                  style={{ backgroundImage: `url('${categoryImage(category.sourceSlug)}')` }}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-bold group-hover:text-brand">
                    {category.name}
                  </span>
                  <span className="text-[11px] text-muted">
                    {t('subcategories', { count: category.children.length })} ·{' '}
                    {t('productCount', { count: formatNumber(total) })}
                  </span>
                </span>
              </Link>

              {category.children.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5 p-3.5">
                  {category.children.map((child) => (
                    <li key={child.id}>
                      <Link
                        href={{ pathname: '/category/[slug]', params: { slug: child.slug } }}
                        className="inline-block rounded-pill border border-line bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-ink-soft transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand"
                      >
                        {child.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )
        })}
      </div>
    </Container>
  )
}
