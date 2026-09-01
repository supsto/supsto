import { Link } from '@/i18n/navigation'

import { cn, formatNumber } from '@/lib/utils'
import type { LocalizedCategory } from '@/lib/queries/categories'

/** Kategori adına göre sabit bir yer tutucu görsel seçer. */
const IMAGE_BY_SLUG: Record<string, string> = {
  ambalaj: '/assets/cardboard.svg',
  elektronik: '/assets/electronics.svg',
  tekstil: '/assets/fabric.svg',
  otomotiv: '/assets/machine.svg',
  makine: '/assets/machine.svg',
  gida: '/assets/food.svg',
  plastik: '/assets/plastic-crate.svg',
}

export function categoryImage(slug: string) {
  return IMAGE_BY_SLUG[slug] ?? '/assets/warehouse.svg'
}

export function CategoryTile({
  category,
  count,
  className,
}: {
  category: LocalizedCategory
  count?: number
  className?: string
}) {
  return (
    <Link
      href={{ pathname: '/category/[slug]', params: { slug: category.slug } }}
      className={cn(
        'group relative overflow-hidden rounded-card border border-line bg-cover bg-center',
        className
      )}
      style={{ backgroundImage: `url('${categoryImage(category.sourceSlug)}')` }}
    >
      <div className="absolute inset-0 bg-linear-to-t from-primary/75 via-primary/10 to-transparent transition-opacity group-hover:from-primary/85" />
      <div className="absolute inset-x-4 bottom-3.5 text-white">
        <div className="text-lg font-extrabold leading-tight">{category.name}</div>
        {count !== undefined ? (
          <div className="text-[11px] text-white/80">{formatNumber(count)} ürün</div>
        ) : null}
      </div>
    </Link>
  )
}
