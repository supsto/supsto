import 'server-only'

import { headers } from 'next/headers'

/**
 * Sitenin genel adresi.
 *
 * Öncelik sırası:
 *   1. NEXT_PUBLIC_SITE_URL  — açıkça ayarlanmışsa daima kazanır
 *   2. VERCEL_PROJECT_PRODUCTION_URL — Vercel'in kendi verdiği alan adı
 *   3. İsteğin başlıkları    — proxy arkasındaki gerçek host
 *   4. localhost             — yalnızca hiçbir şey bulunamazsa
 *
 * Neden istekten türetiyoruz: değişken tanımsızken sabit 'localhost'
 * dönmek üretimde e-posta doğrulama bağlantılarını ve canonical/hreflang
 * etiketlerini sessizce bozuyordu. Eksik yapılandırma bir hataysa bile
 * çalışan bir adres üretmek, kırık bağlantı üretmekten iyidir.
 */
export async function getSiteUrl(): Promise<string> {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/+$/, '')

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercel) return `https://${vercel}`

  const requestHeaders = await headers()
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host')
  if (host) {
    const proto =
      requestHeaders.get('x-forwarded-proto') ??
      (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https')
    return `${proto}://${host}`
  }

  return 'http://localhost:3000'
}
