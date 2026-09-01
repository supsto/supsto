'use client'

import { useTranslations } from 'next-intl'

import { Link, usePathname, type AppPathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

type Key =
  | 'overview' | 'products' | 'quotes' | 'samples' | 'company' | 'import'
  | 'orders' | 'messages' | 'notifications' | 'favorites' | 'myRfqs'
  | 'verifications' | 'companies' | 'analytics' | 'reviews' | 'alerts'
  | 'groupBuys' | 'reports'

interface Item {
  href: AppPathname
  key: Key
  badge?: number
}

/**
 * Panel gezinmesi. Bölümler role göre gösterilir: alıcı ürün yönetimi
 * görmez, tedarikçi olmayan tedarikçi bölümünü görmez.
 */
export function PanelNav({
  isSupplier,
  isAdmin,
  unreadMessages = 0,
  unreadNotifications = 0,
}: {
  isSupplier: boolean
  isAdmin: boolean
  unreadMessages?: number
  unreadNotifications?: number
}) {
  const t = useTranslations('panel')
  const pathname = usePathname()

  const groups: { title: Key | 'supplier' | 'buyer' | 'admin'; items: Item[] }[] = [
    {
      title: 'buyer',
      items: [
        { href: '/dashboard', key: 'overview' },
        { href: '/rfq', key: 'myRfqs' },
        { href: '/orders', key: 'orders' },
        { href: '/favorites', key: 'favorites' },
        { href: '/alerts', key: 'alerts' },
        { href: '/group-buys', key: 'groupBuys' },
      ],
    },
    ...(isSupplier
      ? [
          {
            title: 'supplier' as const,
            items: [
              { href: '/dashboard/products' as AppPathname, key: 'products' as Key },
              { href: '/dashboard/analytics' as AppPathname, key: 'analytics' as Key },
              { href: '/dashboard/quotes' as AppPathname, key: 'quotes' as Key },
              { href: '/dashboard/samples' as AppPathname, key: 'samples' as Key },
              { href: '/dashboard/reviews' as AppPathname, key: 'reviews' as Key },
              { href: '/dashboard/import' as AppPathname, key: 'import' as Key },
              { href: '/dashboard/company' as AppPathname, key: 'company' as Key },
            ],
          },
        ]
      : []),
    {
      title: 'overview',
      items: [
        { href: '/messages', key: 'messages', badge: unreadMessages },
        { href: '/notifications', key: 'notifications', badge: unreadNotifications },
      ],
    },
    ...(isAdmin
      ? [
          {
            title: 'admin' as const,
            items: [
              { href: '/admin' as AppPathname, key: 'overview' as Key },
              { href: '/admin/verifications' as AppPathname, key: 'verifications' as Key },
              { href: '/admin/companies' as AppPathname, key: 'companies' as Key },
              { href: '/admin/reports' as AppPathname, key: 'reports' as Key },
            ],
          },
        ]
      : []),
  ]

  return (
    <nav aria-label={t('menu')} className="space-y-5">
      {groups.map((group, index) => (
        <div key={`${group.title}-${index}`}>
          <h2 className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-faint">
            {t(group.title)}
          </h2>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href))

              return (
                <li key={`${item.href}-${item.key}`}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-field px-2.5 py-2 text-[13px] font-semibold transition-colors',
                      active
                        ? 'bg-brand-soft text-brand'
                        : 'text-ink-soft hover:bg-surface-2 hover:text-ink'
                    )}
                  >
                    {t(item.key)}
                    {item.badge ? (
                      <span className="grid min-w-5 place-items-center rounded-pill bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
