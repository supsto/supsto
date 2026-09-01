import { locale as rootLocale } from 'next/root-params'
import { getTranslations } from 'next-intl/server'

import { convert, LOCALE_CURRENCY } from '@/lib/currency'
import { getRates } from '@/lib/currency.server'
import { cn, formatCurrency } from '@/lib/utils'

/**
 * Fiyatı kendi para biriminde gösterir; alıcının diline karşılık gelen
 * para birimi farklıysa altına yaklaşık karşılığını ekler.
 */
export async function PriceWithConversion({
  amount,
  currency,
  className,
  approxClassName,
}: {
  amount: number | null
  currency: string
  className?: string
  approxClassName?: string
}) {
  const [locale, rates, t] = await Promise.all([
    rootLocale(),
    getRates(),
    getTranslations('cost'),
  ])

  const target = LOCALE_CURRENCY[locale ?? 'tr'] ?? 'TRY'
  const approx = target === currency ? null : convert(amount, currency, target, rates)

  return (
    <span className={cn('inline-flex flex-col', className)}>
      <span>{formatCurrency(amount, currency)}</span>
      {approx !== null ? (
        <span
          className={cn('text-[10px] font-normal text-muted', approxClassName)}
          title={t('inYourCurrency')}
        >
          {t('approx', { value: formatCurrency(approx, target) })}
        </span>
      ) : null}
    </span>
  )
}
