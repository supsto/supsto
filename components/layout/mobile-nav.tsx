'use client'

import { Link, usePathname, type AppPathname } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

const ITEMS: { href: AppPathname; key: 'home' | 'searchLabel' | 'rfq' | 'dashboard'; icon: ReactNode }[] = [
  {
    href: '/',
    key: 'home',
    icon: <path d="M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-4v-4H8v4H4a1 1 0 0 1-1-1V9.5Z" />,
  },
  {
    href: '/search',
    key: 'searchLabel',
    icon: <path d="M8.5 15a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13Zm4.7-1.8L18 18" />,
  },
  {
    href: '/rfq',
    key: 'rfq',
    icon: <path d="M5 3h7l3 3v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm2 7h6M7 13h4" />,
  },
  {
    href: '/dashboard',
    key: 'dashboard',
    icon: <path d="M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 7a6 6 0 0 1 12 0" />,
  },
]

export function MobileNav() {
  const t = useTranslations('nav')
  const pathname = usePathname()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] pt-1.5 md:hidden"
      aria-label={t('bottomMenu')}
    >
      {ITEMS.map((item) => {
        const active =
          item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-1.5 text-[10px] font-semibold transition-colors',
              active ? 'text-brand' : 'text-muted'
            )}
          >
            <svg
              viewBox="0 0 20 20"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {item.icon}
            </svg>
            {t(item.key)}
          </Link>
        )
      })}
    </nav>
  )
}
