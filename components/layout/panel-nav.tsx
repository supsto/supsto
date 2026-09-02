'use client'

import { useTranslations } from 'next-intl'

import { Link, usePathname, type AppPathname } from '@/i18n/navigation'
import type { PanelMode } from '@/lib/account'
import { definitionOf, type KindModule } from '@/lib/business-kind'
import { cn } from '@/lib/utils'

type Key =
  | 'overview' | 'products' | 'quotes' | 'samples' | 'company' | 'import'
  | 'orders' | 'messages' | 'notifications' | 'favorites' | 'myRfqs'
  | 'verifications' | 'companies' | 'analytics' | 'reviews' | 'alerts'
  | 'groupBuys' | 'reports' | 'profile'
  | 'capacity' | 'clearance' | 'templates'

type GroupTitle = 'sell' | 'buy' | 'account' | 'admin' | 'tools'

/**
 * İş tipine özel modüllerin rota karşılığı.
 *
 * Bir modül burada yoksa menüde de çıkmaz; sayfası olmayan bağlantı
 * göstermektense hiç göstermemek doğru.
 */
const MODULE_ROUTES: Partial<Record<KindModule, { href: AppPathname; key: Key }>> = {
  capacity: { href: '/dashboard/capacity', key: 'capacity' },
  clearance: { href: '/dashboard/clearance', key: 'clearance' },
  templates: { href: '/templates', key: 'templates' },
  groupBuy: { href: '/group-buys', key: 'groupBuys' },
}

interface Item {
  href: AppPathname
  key: Key
  badge?: number
}

/**
 * Panel gezinmesi hesap tipine göre değişir.
 *
 *   toptancı   → satış araçları (katalog, teklifler, numune, analitik)
 *   perakendeci→ alım araçları (talepler, favoriler, alarmlar, havuz)
 *   ikisi      → aktif panele göre; üstteki geçiş düğmesiyle değişir
 *
 * Herkese açık bölümler (siparişler, mesajlar, hesap) her iki panelde
 * de görünür — sipariş iki tarafı da ilgilendirir.
 */
export function PanelNav({
  mode,
  isSupplier,
  isAdmin,
  companyKind,
  unreadMessages = 0,
  unreadNotifications = 0,
}: {
  mode: PanelMode
  /** İş tipi; tipe özel araçlar bundan türer. */
  companyKind?: string | null
  isSupplier: boolean
  isAdmin: boolean
  unreadMessages?: number
  unreadNotifications?: number
}) {
  const t = useTranslations('panel')
  const pathname = usePathname()

  const sellItems: Item[] = [
    { href: '/dashboard', key: 'overview' },
    { href: '/dashboard/products', key: 'products' },
    { href: '/dashboard/quotes', key: 'quotes' },
    { href: '/dashboard/samples', key: 'samples' },
    { href: '/dashboard/analytics', key: 'analytics' },
    { href: '/dashboard/reviews', key: 'reviews' },
    { href: '/dashboard/import', key: 'import' },
    { href: '/dashboard/company', key: 'company' },
  ]

  const buyItems: Item[] = [
    { href: '/dashboard', key: 'overview' },
    { href: '/rfq', key: 'myRfqs' },
    { href: '/favorites', key: 'favorites' },
    { href: '/alerts', key: 'alerts' },
    { href: '/group-buys', key: 'groupBuys' },
  ]

  /*
    Tipe özel araçlar ayrı bir grupta durur. Satış/alım gruplarına
    karıştırmak, üreticinin "boş kapasite"yi katalog sanmasına yol
    açıyordu; bunlar farklı işler.
  */
  const toolItems: Item[] = (definitionOf(companyKind)?.modules ?? [])
    .map((module) => MODULE_ROUTES[module])
    .filter((entry): entry is { href: AppPathname; key: Key } => Boolean(entry))
    // Katalog zaten satış grubunda; iki kez göstermeyelim.
    .filter((entry) => entry.key !== 'products')

  const groups: { title: GroupTitle; items: Item[] }[] = [
    mode === 'supplier'
      ? { title: 'sell', items: isSupplier ? sellItems : [sellItems[0], sellItems[7]] }
      : { title: 'buy', items: buyItems },
    ...(toolItems.length > 0
      ? [{ title: 'tools' as const, items: toolItems }]
      : []),
    {
      title: 'account',
      items: [
        { href: '/orders', key: 'orders' },
        { href: '/messages', key: 'messages', badge: unreadMessages },
        { href: '/notifications', key: 'notifications', badge: unreadNotifications },
        { href: '/profile', key: 'profile' },
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
      {groups.map((group) => (
        <div key={group.title}>
          <h2 className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-faint">
            {t(group.title)}
          </h2>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              // '/dashboard' her alt sayfayla eşleşmesin diye tam eşitlik.
              const active =
                item.href === '/dashboard' || item.href === '/admin'
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`)

              return (
                <li key={`${group.title}-${item.href}-${item.key}`}>
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
