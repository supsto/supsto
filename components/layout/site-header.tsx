import { locale as getLocale } from 'next/root-params'

import { getCurrentProfile } from '@/lib/auth/session'
import { defaultLocale, type Locale } from '@/i18n/routing'
import { getCategoryTree } from '@/lib/queries/categories'
import { SiteHeaderShell } from './site-header-shell'
import { TopBar } from './top-bar'

/** Oturum ve kategori ağacını sunucuda okur; görünümü istemciye devreder. */
export async function SiteHeader() {
  const [profile, locale, tree] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    getCategoryTree(),
  ])

  return (
    <>
      <TopBar />
      <SiteHeaderShell
        locale={(locale as Locale) ?? defaultLocale}
        userInitial={
          profile ? (profile.full_name ?? 'S').slice(0, 1).toLocaleUpperCase('tr-TR') : null
        }
        categories={tree.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          sourceSlug: c.sourceSlug,
          children: c.children.map((child) => ({
            id: child.id,
            name: child.name,
            slug: child.slug,
          })),
        }))}
      />
    </>
  )
}
