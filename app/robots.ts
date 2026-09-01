import type { MetadataRoute } from 'next'

import { siteUrl } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
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
