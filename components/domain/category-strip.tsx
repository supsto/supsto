import { Link } from '@/i18n/navigation'

import { CategoryIcon } from '@/components/domain/category-icon'
import { formatNumber } from '@/lib/utils'
import type { LocalizedCategory } from '@/lib/queries/categories'

/**
 * Hero'nun hemen altındaki kategori kısayolları. Dar ekranda yatay kayar,
 * geniş ekranda tek satıra yayılır.
 */
export function CategoryStrip({
  categories,
  counts,
}: {
  categories: LocalizedCategory[]
  counts?: Map<string, number>
}) {
  if (categories.length === 0) return null

  return (
    <nav aria-label="Kategoriler">
      <ul className="no-scrollbar -mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-6 md:overflow-visible md:px-0 xl:grid-cols-12">
        {categories.map((category) => {
          const count = counts?.get(category.id)
          return (
            <li key={category.id} className="shrink-0 snap-start">
              <Link
                href={{ pathname: '/category/[slug]', params: { slug: category.slug } }}
                className="group flex h-full w-24 flex-col items-center gap-2 rounded-card border border-line bg-surface px-2 py-3.5 text-center transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-card md:w-auto"
              >
                <span className="grid size-11 place-items-center rounded-full bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                  <CategoryIcon slug={category.sourceSlug} />
                </span>
                <span className="text-[11px] font-bold leading-tight text-ink group-hover:text-brand">
                  {category.name}
                </span>
                {count !== undefined ? (
                  <span className="text-[10px] text-faint">{formatNumber(count)} ürün</span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
