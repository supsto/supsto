import { locale as rootLocale } from 'next/root-params'
import { getTranslations } from 'next-intl/server'

import { CurrencySwitcher } from '@/components/layout/currency-switcher'
import { LocaleSwitcher } from '@/components/layout/locale-switcher'
import { Link } from '@/i18n/navigation'
import { defaultLocale, type Locale } from '@/i18n/routing'
import { activeCurrency, getRates } from '@/lib/currency.server'

/**
 * En üst bilgi çubuğu.
 *
 * Kurlar `exchange_rates` tablosundan gelir ve GÖSTERGE olarak
 * etiketlenir — canlı piyasa beslemesi yoktur. Sözleşme değeri daima
 * ürünün kendi para birimidir; burada gördüğü rakama dayanarak alım
 * kararı veren biri yanılmasın diye bu ayrım açıkça yazılır.
 */
export async function TopBar() {
  const [locale, t] = await Promise.all([rootLocale(), getTranslations('topbar')])
  const active = (locale as Locale) ?? defaultLocale

  const [rates, currency] = await Promise.all([getRates(), activeCurrency(active)])

  // TRY tabanlı gösterge kurlar; yalnızca kur kaydı olanlar gösterilir.
  const pairs = (['USD', 'EUR', 'RUB'] as const).flatMap((code) => {
    const rate = rates.get(`${code}:TRY`)
    return rate ? [{ code, rate }] : []
  })

  return (
    <div className="hidden border-b border-white/10 bg-primary text-primary-ink lg:block">
      <div className="mx-auto flex h-9 max-w-[1400px] items-center gap-6 px-4 text-[11px] md:px-6">
        {pairs.length > 0 ? (
          <div className="flex items-center gap-4" title={t('ratesHint')}>
            <span className="text-primary-muted">{t('rates')}</span>
            {pairs.map((p) => (
              <span key={p.code} className="tabular-nums">
                {p.code}/TRY{' '}
                <b className="font-semibold text-white">{p.rate.toFixed(2)}</b>
              </span>
            ))}
          </div>
        ) : null}

        <div className="ml-auto flex items-center gap-4">
          <Link href="/register" className="font-semibold hover:text-white">
            {t('sellOnSupsto')}
          </Link>
          <Link href="/contact" className="hover:text-white">
            {t('support')}
          </Link>
          <span className="h-4 w-px bg-white/15" aria-hidden="true" />
          <CurrencySwitcher current={currency} />
          <LocaleSwitcher current={active} tone="dark" />
        </div>
      </div>
    </div>
  )
}
