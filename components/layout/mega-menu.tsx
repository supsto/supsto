'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { CategoryIcon } from '@/components/domain/category-icon'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

interface Node {
  id: string
  name: string
  slug: string
  sourceSlug: string
  children: { id: string; name: string; slug: string }[]
}

/**
 * Kategori mega menüsü.
 *
 * Veri iki seviyeli (ana sektör → alt sektör); üçüncü seviye
 * (ürün grubu) şemada destekleniyor ama henüz veri girilmedi, o yüzden
 * gösterilmiyor. Boş bir üçüncü sütun göstermek yerine iki seviye
 * temiz duruyor.
 */
export function MegaMenu({ categories }: { categories: Node[] }) {
  const t = useTranslations('mega')
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState(categories[0]?.id ?? '')
  const active = categories.find((c) => c.id === activeId) ?? categories[0]

  return (
    <div
      className="relative"
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-field px-3 py-2 text-[13px] font-semibold transition-colors hover:bg-surface-2"
      >
        <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
          <path fill="currentColor" d="M1 2.5h14v2H1zm0 5h14v2H1zm0 5h14v2H1z" />
        </svg>
        {t('browse')}
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-40 w-[720px] overflow-hidden rounded-card border border-line bg-surface shadow-lift">
          <div className="grid grid-cols-[240px_1fr]">
            <ul className="border-r border-line bg-surface-2 py-2">
              {categories.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveId(c.id)}
                    onFocus={() => setActiveId(c.id)}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13px] transition-colors',
                      activeId === c.id
                        ? 'bg-surface font-bold text-brand'
                        : 'text-ink-soft hover:bg-surface'
                    )}
                  >
                    <CategoryIcon slug={c.sourceSlug} className="size-4 shrink-0" />
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>

            <div className="p-4">
              {active ? (
                <>
                  <Link
                    href={{ pathname: '/category/[slug]', params: { slug: active.slug } }}
                    className="text-sm font-bold hover:text-brand"
                    onClick={() => setOpen(false)}
                  >
                    {active.name} →
                  </Link>
                  <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {active.children.map((child) => (
                      <li key={child.id}>
                        <Link
                          href={{ pathname: '/category/[slug]', params: { slug: child.slug } }}
                          onClick={() => setOpen(false)}
                          className="block py-1 text-[13px] text-ink-soft hover:text-brand"
                        >
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
