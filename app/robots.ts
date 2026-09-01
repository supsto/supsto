import type { MetadataRoute } from 'next'

import { getSiteUrl } from '@/lib/site-url'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteUrl = await getSiteUrl()

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Oturuma özel ve indekslenmesi anlamsız alanlar.
      disallow: [
        '/api/',
        '/auth/',
        '/*/panel',
        '/*/dashboard',
        '/*/kabinet',
        '/*/giris',
        '/*/login',
        '/*/vhod',
        '/*/kayit',
        '/*/register',
        '/*/registratsiya',
        '/*/dogrula',
        '/*/verify',
        '/*/podtverzhdenie',
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
