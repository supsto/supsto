import type { Metadata } from 'next'

import { getPathname } from '@/i18n/navigation'
import { locales, type Locale } from '@/i18n/routing'
import { getSiteUrl } from '@/lib/site-url'

type Href = Parameters<typeof getPathname>[0]['href']

/**
 * Dile göre değişebilen hedef. Kategori sayfaları gibi SLUG'I DA çevrilen
 * rotalarda her dilin kendi slug'ı verilmelidir; sabit bir href kullanmak
 * hreflang'i yanlış sayfaya bağlar.
 */
type HrefResolver = Href | ((locale: Locale) => Href)

function resolve(href: HrefResolver, locale: Locale): Href {
  return typeof href === 'function' ? href(locale) : href
}

/**
 * Her sayfa için canonical + hreflang alternatifleri üretir.
 *
 * Google bir sayfanın diğer dillerdeki karşılıklarını yalnızca hreflang
 * ile eşleştirir; olmadan /tr/iletisim ve /en/contact birbirinden habersiz
 * iki sayfa gibi taranır. x-default dil tercihi bilinmeyen ziyaretçi içindir.
 */
export async function alternates(
  href: HrefResolver,
  locale: Locale
): Promise<Metadata['alternates']> {
  const siteUrl = await getSiteUrl()
  const url = (l: Locale) =>
    `${siteUrl}${getPathname({ href: resolve(href, l), locale: l })}`

  return {
    canonical: url(locale),
    languages: {
      ...Object.fromEntries(locales.map((l) => [l, url(l)])),
      'x-default': url('tr'),
    },
  }
}

export { getSiteUrl }
export type { HrefResolver }
