import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { cn } from '@/lib/utils'

export async function Pagination({
  total,
  pageSize,
  currentPage,
  baseParams,
}: {
  total: number
  pageSize: number
  currentPage: number
  /** Sayfa dışındaki mevcut sorgu parametreleri. */
  baseParams: Record<string, string>
}) {
  const t = await getTranslations('common')
  const pageCount = Math.ceil(total / pageSize)
  if (pageCount <= 1) return null

  // Yalnızca sorgu dizesi değişir; yol ve dil aynı kaldığı için
  // çeviri gerektirmez, düz next/link yeterli.
  const href = (page: number) => {
    const params = new URLSearchParams(baseParams)
    if (page > 1) params.set('sayfa', String(page))
    else params.delete('sayfa')
    const query = params.toString()
    return query ? `?${query}` : '?'
  }

  // Geçerli sayfanın çevresinde dar bir pencere göster.
  const from = Math.max(1, currentPage - 2)
  const to = Math.min(pageCount, from + 4)
  const pages = Array.from({ length: to - from + 1 }, (_, i) => from + i)

  return (
    <nav className="mt-6 flex flex-wrap items-center justify-center gap-1.5" aria-label={t('pagination')}>
      {currentPage > 1 ? (
        <Link
          href={href(currentPage - 1)}
          className="rounded-field border border-line bg-surface px-3 py-2 text-xs font-semibold hover:bg-surface-2"
        >
          ← {t('previous')}
        </Link>
      ) : null}

      {pages.map((page) => (
        <Link
          key={page}
          href={href(page)}
          aria-current={page === currentPage ? 'page' : undefined}
          className={cn(
            'min-w-9 rounded-field border px-3 py-2 text-center text-xs font-semibold',
            page === currentPage
              ? 'border-brand bg-brand text-white'
              : 'border-line bg-surface hover:bg-surface-2'
          )}
        >
          {page}
        </Link>
      ))}

      {currentPage < pageCount ? (
        <Link
          href={href(currentPage + 1)}
          className="rounded-field border border-line bg-surface px-3 py-2 text-xs font-semibold hover:bg-surface-2"
        >
          {t('next')} →
        </Link>
      ) : null}
    </nav>
  )
}
