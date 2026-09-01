import { getPathname } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'

/**
 * Bildirim URL'leri veritabanında KANONİK yol olarak saklanır
 * (`/rfq/<id>`). Aktif dilin karşılığına burada çevrilir; aksi halde
 * Rusça bir kullanıcı `/rfq/...` bağlantısına tıklayıp yönlendirmeye
 * takılırdı.
 *
 * Tanınmayan bir desen olduğu gibi bırakılır — proxy dil önekini ekler.
 */
export function localizeNotificationUrl(url: string | null, locale: Locale): string | null {
  if (!url) return null

  const patterns: [RegExp, (m: RegExpMatchArray) => string][] = [
    [/^\/rfq\/([^/]+)$/, (m) => getPathname({ href: { pathname: '/rfq/[id]', params: { id: m[1] } }, locale })],
    [/^\/messages\/([^/]+)$/, (m) => getPathname({ href: { pathname: '/messages/[id]', params: { id: m[1] } }, locale })],
    [/^\/orders\/([^/]+)$/, (m) => getPathname({ href: { pathname: '/orders/[id]', params: { id: m[1] } }, locale })],
    [/^\/dashboard\/samples$/, () => getPathname({ href: '/dashboard/samples', locale })],
    [/^\/dashboard$/, () => getPathname({ href: '/dashboard', locale })],
  ]

  for (const [pattern, build] of patterns) {
    const match = url.match(pattern)
    if (match) return build(match)
  }
  return url
}
