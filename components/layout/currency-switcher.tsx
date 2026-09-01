'use client'

import { useTranslations } from 'next-intl'
import { useTransition } from 'react'

import { CURRENCIES, type CurrencyCode } from '@/lib/currency'
import { setCurrency } from '@/lib/actions/preferences'
import { cn } from '@/lib/utils'

export function CurrencySwitcher({
  current,
  className,
}: {
  current: CurrencyCode
  className?: string
}) {
  const t = useTranslations('topbar')
  const [pending, startTransition] = useTransition()

  return (
    <form
      action={(formData) => startTransition(() => void setCurrency(formData))}
      className={cn('inline-flex', className)}
    >
      <label htmlFor="currency-switcher" className="sr-only">
        {t('currency')}
      </label>
      <select
        id="currency-switcher"
        name="currency"
        defaultValue={current}
        disabled={pending}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="cursor-pointer appearance-none bg-transparent py-1 pr-1 text-[11px] font-semibold text-primary-ink outline-none"
      >
        {CURRENCIES.map((code) => (
          <option key={code} value={code} className="text-ink">
            {code}
          </option>
        ))}
      </select>
    </form>
  )
}
