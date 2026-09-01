import type { MetadataRoute } from 'next'

import { getPathname } from '@/i18n/navigation'
import { locales, type Locale } from '@/i18n/routing'
import { siteUrl, type HrefResolver } from '@/lib/seo'
import { createClient } from '@/lib/supabase/server'

type Href = Parameters<typeof getPathname>[0]['href']

/** Her giriş için tüm dillerin karşılığını `alternates.languages` ile bildirir. */
function entry(
  href: HrefResolver,
  opts: { priority?: number; changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency']; lastModified?: Date } = {}
): MetadataRoute.Sitemap {
  const resolve = (l: Locale): Href =>
    typeof href === 'function' ? href(l) : href
  const url = (l: Locale) => `${siteUrl}${getPathname({ href: resolve(l), locale: l })}`

  return locales.map((locale: Locale) => ({
    url: url(locale),
    alternates: {
      languages: Object.fromEntries(locales.map((l) => [l, url(l)])),
    },
    ...opts,
  }))
}

const STATIC: { href: Href; priority: number }[] = [
  { href: '/', priority: 1 },
  { href: '/search', priority: 0.9 },
  { href: '/categories', priority: 0.8 },
  { href: '/suppliers', priority: 0.8 },
  { href: '/rfq', priority: 0.9 },
  { href: '/rfq/new', priority: 0.6 },
  { href: '/about', priority: 0.4 },
  { href: '/how-it-works', priority: 0.5 },
  { href: '/for-buyers', priority: 0.5 },
  { href: '/for-suppliers', priority: 0.5 },
  { href: '/verification', priority: 0.4 },
  { href: '/faq', priority: 0.4 },
  { href: '/contact', priority: 0.4 },
  { href: '/terms', priority: 0.2 },
  { href: '/privacy', priority: 0.2 },
  { href: '/kvkk', priority: 0.2 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  const [categories, products, companies, rfqs] = await Promise.all([
    supabase.from('category_translations').select('category_id, locale, slug'),
    supabase.from('products').select('slug, updated_at').eq('status', 'active'),
    supabase.from('companies').select('slug, updated_at').eq('status', 'active'),
    supabase.from('rfqs').select('id, updated_at').eq('status', 'open'),
  ])

  return [
    ...STATIC.flatMap((s) =>
      entry(s.href, { priority: s.priority, changeFrequency: 'daily' })
    ),
    // Kategori slug'ı dile göre değişir; her dil kendi slug'ıyla girer.
    ...Object.values(
      (categories.data ?? []).reduce<Record<string, Record<string, string>>>(
        (acc, row) => {
          ;(acc[row.category_id] ??= {})[row.locale] = row.slug
          return acc
        },
        {}
      )
    ).flatMap((byLocale) =>
      entry(
        (l) => ({
          pathname: '/category/[slug]',
          params: { slug: byLocale[l] ?? byLocale.tr },
        }),
        { priority: 0.7 }
      )
    ),
    ...(products.data ?? []).flatMap((p) =>
      entry(
        { pathname: '/product/[slug]', params: { slug: p.slug } },
        { priority: 0.8, lastModified: new Date(p.updated_at) }
      )
    ),
    ...(companies.data ?? []).flatMap((c) =>
      entry(
        { pathname: '/supplier/[slug]', params: { slug: c.slug } },
        { priority: 0.7, lastModified: new Date(c.updated_at) }
      )
    ),
    ...(rfqs.data ?? []).flatMap((r) =>
      entry(
        { pathname: '/rfq/[id]', params: { id: r.id } },
        { priority: 0.6, lastModified: new Date(r.updated_at) }
      )
    ),
  ]
}
