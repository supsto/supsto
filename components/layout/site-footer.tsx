import { getTranslations } from 'next-intl/server'

import { Link, type AppPathname } from '@/i18n/navigation'
import { Logo } from './logo'

type Key = Parameters<Awaited<ReturnType<typeof getTranslations<'footer'>>>>[0]

const COLUMNS: { title: Key; links: { href: AppPathname; label: Key }[] }[] = [
  {
    title: 'explore',
    links: [
      { href: '/search', label: 'products' },
      { href: '/categories', label: 'categories' },
      { href: '/suppliers', label: 'suppliers' },
      { href: '/rfq', label: 'openRfqs' },
    ],
  },
  {
    title: 'forBuyers',
    links: [
      { href: '/rfq/new', label: 'createRfq' },
      { href: '/for-buyers', label: 'buyerSolution' },
      { href: '/how-it-works', label: 'howItWorks' },
    ],
  },
  {
    title: 'forSuppliers',
    links: [
      { href: '/register', label: 'companyRegistration' },
      { href: '/for-suppliers', label: 'supplierSolution' },
      { href: '/verification', label: 'verification' },
    ],
  },
  {
    title: 'corporate',
    links: [
      { href: '/about', label: 'about' },
      { href: '/contact', label: 'contact' },
      { href: '/faq', label: 'faq' },
      { href: '/glossary', label: 'glossary' },
    ],
  },
]

const LEGAL: { href: AppPathname; label: Key }[] = [
  { href: '/terms', label: 'terms' },
  { href: '/privacy', label: 'privacy' },
  { href: '/kvkk', label: 'kvkk' },
]

export async function SiteFooter() {
  const t = await getTranslations('footer')

  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto max-w-[1400px] px-4 py-12 md:px-6">
        <div className="grid gap-10 md:grid-cols-[1.2fr_repeat(4,1fr)]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-muted">
              {t('tagline')}
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-faint">
                {t(column.title)}
              </h2>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-xs text-ink-soft transition-colors hover:text-brand"
                    >
                      {t(link.label)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-line pt-6 text-[11px] text-faint sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Supsto — {t('rights')}
          </p>
          <div className="flex gap-4">
            {LEGAL.map((link) => (
              <Link key={link.label} href={link.href} className="hover:text-ink">
                {t(link.label)}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
