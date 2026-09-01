import { getTranslations } from 'next-intl/server'

import { Logo } from '@/components/layout/logo'
import { LocaleSwitcher } from '@/components/layout/locale-switcher'
import { Link } from '@/i18n/navigation'
import { defaultLocale, type Locale } from '@/i18n/routing'
import { locale as rootLocale } from 'next/root-params'
import { getPlatformStats } from '@/lib/queries/stats'
import { formatNumber } from '@/lib/utils'

/**
 * Bölünmüş giriş ekranı: solda marka paneli, sağda form.
 *
 * Sol panel yalnızca dekorasyon değil — kayıt olmadan önce sorulan
 * "burası ne işe yarıyor?" sorusunu gerçek sayılarla yanıtlar.
 * Dar ekranda gizlenir; formun önüne geçmemeli.
 */
export default async function AuthLayout({ children }: LayoutProps<'/[locale]'>) {
  const [t, stats, locale] = await Promise.all([
    getTranslations('auth'),
    getPlatformStats(),
    rootLocale(),
  ])

  const points = [t('brandPoint1'), t('brandPoint2'), t('brandPoint3')]
  const figures: [string, number][] = [
    [t('brandStat1'), stats.verifiedCompanies],
    [t('brandStat2'), stats.products],
    [t('brandStat3'), stats.openRfqs],
  ]

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* ---- Marka paneli ---- */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-linear-to-br from-hero-from via-hero-via to-hero-to p-10 text-white lg:flex">
        <div
          className="absolute -right-24 -top-32 size-96 rounded-full bg-white/5"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-40 -left-24 size-96 rounded-full bg-white/5"
          aria-hidden="true"
        />

        <Logo tone="light" />

        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl font-extrabold leading-tight">{t('brandTitle')}</h2>
          <p className="mt-3 text-sm leading-relaxed text-hero-ink">{t('brandLead')}</p>

          <ul className="mt-7 space-y-3">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-[13px] text-hero-ink">
                <svg viewBox="0 0 20 20" className="mt-0.5 size-4 shrink-0 text-hero-accent" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M10 .8a9.2 9.2 0 1 0 0 18.4A9.2 9.2 0 0 0 10 .8Zm-1 13.4-4-4 1.4-1.4L9 11.4l5.6-5.6L16 7.2l-7 7Z"
                  />
                </svg>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <dl className="relative z-10 grid grid-cols-3 gap-4 border-t border-white/15 pt-6">
          {figures.map(([label, value]) => (
            <div key={label}>
              <dt className="text-[11px] text-hero-muted">{label}</dt>
              <dd className="mt-0.5 text-2xl font-extrabold tabular-nums">
                {formatNumber(value)}
              </dd>
            </div>
          ))}
        </dl>
      </aside>

      {/* ---- Form tarafı ---- */}
      <main className="flex flex-col px-4 py-8 sm:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-brand"
          >
            ← {t('backToSite')}
          </Link>
          <div className="flex items-center gap-3">
            <Logo className="lg:hidden" />
            <LocaleSwitcher current={((locale as Locale) ?? defaultLocale)} />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </main>
    </div>
  )
}
