import 'server-only'

import { cache } from 'react'
import { cookies } from 'next/headers'

import { getCurrentProfile } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { CURRENCIES, CURRENCY_COOKIE, LOCALE_CURRENCY, type CurrencyCode } from './currency'

export const getRates = cache(async (): Promise<Map<string, number>> => {
  const supabase = await createClient()
  const { data } = await supabase.from('exchange_rates').select('base, quote, rate')
  return new Map((data ?? []).map((r) => [`${r.base}:${r.quote}`, Number(r.rate)]))
})

/**
 * Ziyaretçinin görmek istediği para birimi.
 * Sıra: profil tercihi → çerez → dilin varsayılanı.
 */
export const activeCurrency = cache(async (locale: string): Promise<CurrencyCode> => {
  const profile = await getCurrentProfile()
  const fromProfile = profile?.preferred_currency
  if (fromProfile && CURRENCIES.includes(fromProfile as CurrencyCode)) {
    return fromProfile as CurrencyCode
  }

  const store = await cookies()
  const fromCookie = store.get(CURRENCY_COOKIE)?.value
  if (fromCookie && CURRENCIES.includes(fromCookie as CurrencyCode)) {
    return fromCookie as CurrencyCode
  }

  return LOCALE_CURRENCY[locale] ?? 'TRY'
})
