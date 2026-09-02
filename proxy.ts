import createIntlMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'

import { getPathname } from '@/i18n/navigation'
import { defaultLocale, locales, routing, type Locale } from '@/i18n/routing'
import { refreshSession } from '@/lib/supabase/proxy'

const handleIntl = createIntlMiddleware(routing)

/** Oturum gerektiren KANONİK rotalar (çevrilmiş slug değil). */
const PROTECTED = [
  '/dashboard',
  '/create-company',
  '/rfq/new',
  '/orders',
  '/messages',
  '/notifications',
  '/favorites',
  '/admin',
  '/alerts',
  '/profile',
  // Sipariş şablonları kişiseldir; RLS zaten boş döndürür ama
  // ziyaretçiyi boş sayfayla karşılamak yerine girişe yönlendiriyoruz.
  '/templates',
] as const

/** Giriş yapmışken görülmemesi gereken kanonik rotalar. */
const GUEST_ONLY = ['/login', '/register', '/verify'] as const

function isProtected(path: string) {
  if (PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))) return true
  // /rfq/<id>/quote — teklif vermek oturum ister, RFQ detayı istemez.
  return /^\/rfq\/[^/]+\/quote$/.test(path)
}

/**
 * next-intl gelen `/tr/iletisim` yolunu içeride `/tr/contact` olarak
 * yeniden yazar ve bunu `x-middleware-rewrite` başlığıyla bildirir.
 * Rota korumasını çevrilmiş yola göre değil, bu kanonik yola göre yaparız —
 * aksi halde her kuralı üç dilde yazmak gerekirdi.
 */
function canonicalPath(request: NextRequest, response: NextResponse) {
  const rewritten = response.headers.get('x-middleware-rewrite')
  const pathname = rewritten
    ? new URL(rewritten, request.url).pathname
    : request.nextUrl.pathname

  return pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/'
}

function localeOf(request: NextRequest): Locale {
  const first = request.nextUrl.pathname.split('/')[1]
  return locales.includes(first as Locale) ? (first as Locale) : defaultLocale
}

export async function proxy(request: NextRequest) {
  // 1) Dil çözümlemesi: eksik önek için yönlendirir, çevrilmiş slug'ı
  //    kanonik yola rewrite eder.
  const response = handleIntl(request)

  // Yönlendirme ise (ör. /iletisim -> /tr/iletisim) oturum tazelemeye gerek
  // yok; tarayıcı zaten yeni adrese gidip buradan tekrar geçecek.
  if (response.status >= 300 && response.status < 400) return response

  // 2) Oturumu tazele — çerezleri next-intl'in response'una yaz.
  const user = await refreshSession(request, response)

  // 3) Rota koruması
  const path = canonicalPath(request, response)
  const locale = localeOf(request)

  if (!user && isProtected(path)) {
    const url = request.nextUrl.clone()
    url.pathname = getPathname({ href: '/login', locale })
    url.search = ''
    url.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search)
    return NextResponse.redirect(url)
  }

  if (user && GUEST_ONLY.some((p) => path === p || path.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone()
    url.pathname = getPathname({ href: '/dashboard', locale })
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Dil öneki ALMAMASI gerekenler hariç her yol:
     *  - _next/*        : derleyici çıktısı
     *  - api/*, auth/*  : API ve OAuth dönüşü, dil bilmez
     *  - robots.txt, sitemap.xml, manifest.webmanifest, favicon.ico:
     *    arama motorları ve tarayıcılar bunları KÖKTEN ister; dile
     *    yönlendirilirlerse bulunamaz.
     *  - uzantılı dosyalar : public/ içindeki varlıklar
     */
    '/((?!_next/|api/|auth/|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|favicon\\.ico|.*\\.[a-zA-Z0-9]+$).*)',
  ],
}
