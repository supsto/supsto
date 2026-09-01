'use client'

import { Link, usePathname, type AppPathname } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { ButtonLink } from '@/components/ui/button'
import { LocaleSwitcher } from '@/components/layout/locale-switcher'
import { cn } from '@/lib/utils'
import { Logo } from './logo'
import { SearchForm } from './search-form'

const NAV: { href: AppPathname; key: 'categories' | 'products' | 'suppliers' | 'rfq' }[] = [
  { href: '/categories', key: 'categories' },
  { href: '/search', key: 'products' },
  { href: '/suppliers', key: 'suppliers' },
  { href: '/rfq', key: 'rfq' },
]

/** Header'ın altına girdiği bölüm `data-hero` ile işaretlenir. */
const HERO_SELECTOR = '[data-hero]'
const HEADER_HEIGHT = 64

/**
 * `data-hero` bölümü render eden rotalar. İlk boyamada DOM'u okuyamadığımız
 * için gereklidir; olmasaydı ana sayfada bir kare opak header görünürdü.
 * Listeye eklenmeyen bir hero yalnızca opak header alır — bozulmaz.
 */
const HERO_ROUTES = new Set<string>(['/'])

export function SiteHeaderShell({
  userInitial,
  locale,
}: {
  userInitial: string | null
  locale: Locale
}) {
  const t = useTranslations('nav')
  const pathname = usePathname()

  // Durumu rota ile birlikte tutuyoruz: istemci tarafı gezinmede bu bileşen
  // (layout'ta olduğu için) unmount olmaz, eski sayfanın şeffaflığı yeni
  // sayfaya taşınmasın.
  const [scrolled, setScrolled] = useState({ path: pathname, past: false })
  const pastHero = scrolled.path === pathname ? scrolled.past : false
  const overHero = HERO_ROUTES.has(pathname) && !pastHero

  useEffect(() => {
    const hero = document.querySelector(HERO_SELECTOR)
    if (!hero) return

    // Görüntü alanının üstünü header kadar aşağı iteriz: hero'nun alt kenarı
    // header'ın altından yukarı çıktığı anda header opaklaşır.
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled({ path: pathname, past: !entry.isIntersecting }),
      { rootMargin: `-${HEADER_HEIGHT}px 0px 0px 0px` }
    )
    observer.observe(hero)
    return () => observer.disconnect()
  }, [pathname])

  return (
    <header
      className={cn(
        'sticky top-0 z-30 h-16 transition-colors duration-300',
        overHero
          ? 'border-b border-transparent bg-transparent text-white'
          : 'border-b border-line bg-canvas/90 backdrop-blur-md'
      )}
    >
      <div className="mx-auto flex h-full max-w-[1400px] items-center gap-4 px-4 md:px-6">
        <Logo tone={overHero ? 'light' : 'dark'} />

        <nav className="hidden items-center gap-1 lg:flex" aria-label={t('mainMenu')}>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-field px-3 py-2 text-[13px] font-semibold transition-colors',
                overHero
                  ? 'text-white/85 hover:bg-white/12 hover:text-white'
                  : 'text-ink-soft hover:bg-surface hover:text-ink'
              )}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <SearchForm
          className="ml-auto hidden w-full max-w-md md:block"
          tone={overHero ? 'dark' : 'light'}
        />

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <LocaleSwitcher
            current={locale}
            tone={overHero ? 'dark' : 'light'}
          />
          {userInitial ? (
            <>
              <ButtonLink
                href="/rfq/new"
                variant={overHero ? 'onDark' : 'primary'}
                size="sm"
                className="hidden sm:inline-flex"
              >
                {t('createRfq')}
              </ButtonLink>
              <ButtonLink
                href="/dashboard"
                variant={overHero ? 'onDark' : 'default'}
                size="sm"
              >
                <span
                  className={cn(
                    'grid size-5 place-items-center rounded-full text-[10px] font-extrabold',
                    overHero ? 'bg-white/25 text-white' : 'bg-brand-soft text-brand'
                  )}
                >
                  {userInitial}
                </span>
                {t('dashboard')}
              </ButtonLink>
            </>
          ) : (
            <>
              <ButtonLink
                href="/login"
                variant={overHero ? 'onDark' : 'default'}
                size="sm"
              >
                {t('login')}
              </ButtonLink>
              <ButtonLink
                href="/register"
                variant={overHero ? 'onDark' : 'primary'}
                size="sm"
              >
                {t('register')}
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
