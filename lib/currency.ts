export const CURRENCIES = ['TRY', 'USD', 'EUR', 'RUB'] as const
export type CurrencyCode = (typeof CURRENCIES)[number]

/** Anonim ziyaretçinin para birimi tercihi. */
export const CURRENCY_COOKIE = 'supsto_currency'

/** Dilin varsayılan para birimi — alıcıya tanıdık gelen birim. */
export const LOCALE_CURRENCY: Record<string, CurrencyCode> = {
  tr: 'TRY',
  en: 'USD',
  ru: 'RUB',
}

/**
 * Yaklaşık çevrim. Sözleşme değeri DAİMA ürünün kendi para birimidir;
 * bu yalnızca alıcının büyüklüğü kavraması içindir, o yüzden "≈" ile
 * gösterilir ve kur yoksa null döner — yanlış sayı göstermektense hiç
 * gösterme.
 *
 * Bu dosya sunucuya özgü hiçbir şey içermez; istemci bileşenleri de
 * güvenle içe aktarabilir.
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
