import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'

export const CURRENCIES = ['TRY', 'USD', 'EUR', 'RUB'] as const
export type CurrencyCode = (typeof CURRENCIES)[number]

/** Dilin varsayılan para birimi — alıcıya tanıdık gelen birim. */
export const LOCALE_CURRENCY: Record<string, CurrencyCode> = {
  tr: 'TRY',
  en: 'USD',
  ru: 'RUB',
}

export const getRates = cache(async (): Promise<Map<string, number>> => {
  const supabase = await createClient()
  const { data } = await supabase.from('exchange_rates').select('base, quote, rate')
  return new Map((data ?? []).map((r) => [`${r.base}:${r.quote}`, Number(r.rate)]))
})

/**
 * Yaklaşık çevrim. Sözleşme değeri DAİMA ürünün kendi para birimidir;
 * bu yalnızca alıcının büyüklüğü kavraması içindir, o yüzden "≈" ile
 * gösterilir ve kur yoksa null döner (yanlış sayı göstermektense hiç
 * gösterme).
 */
export function convert(
  amount: number | null,
  from: string,
  to: string,
  rates: Map<string, number>
): number | null {
  if (amount === null || amount === undefined) return null
  if (from === to) return amount
  const rate = rates.get(`${from}:${to}`)
  return rate ? amount * rate : null
}
