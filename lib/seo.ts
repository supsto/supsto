import type { Metadata } from 'next'

import { getPathname } from '@/i18n/navigation'
import { locales, type Locale } from '@/i18n/routing'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

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
 * Google bir sayfanın diğer dillerdeki karşılıklarını yalnızca hreflang ile
 * eşleştirir; olmadan /tr/iletisim ve /en/contact birbirinden habersiz iki
 * sayfa gibi taranır. x-default dil tercihi bilinmeyen ziyaretçi içindir.
 */
export function alternates(
  href: HrefResolver,
  locale: Locale
): Metadata['alternates'] {
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

/** Sitemap girişleri de aynı çözümlemeyi kullanır. */
export function localeUrls(href: HrefResolver) {
  return Object.fromEntries(
    locales.map((l) => [
      l,
      `${siteUrl}${getPathname({ href: resolve(href, l), locale: l })}`,
    ])
  ) as Record<Locale, string>
}

export { siteUrl }
export type { HrefResolver }
