import { locale as getLocale } from 'next/root-params'

import { getCurrentProfile, getCurrentUser } from '@/lib/auth/session'
import { defaultLocale, type Locale } from '@/i18n/routing'
import { getCategoryTree } from '@/lib/queries/categories'
import { SiteHeaderShell } from './site-header-shell'
import { TopBar } from './top-bar'

/**
 * Oturum ve kategori ağacını sunucuda okur; görünümü istemciye devreder.
 *
 * OTURUM KONTROLÜ `user` ÜZERİNDEN yapılır, profil satırı üzerinden
 * değil. Daha önce profile bakılıyordu: profil satırı eksik olan bir
 * kullanıcı giriş yapmış olmasına rağmen "Giriş / Kayıt" düğmelerini
 * görüyordu — ve o düğmeler hiçbir şey yapmıyordu, çünkü proxy.ts giriş
 * yapmış kullanıcıyı /login'den geri çeviriyor. Kimlik auth'ta,
 * profil yalnızca veri.
 */
export async function SiteHeader() {
  const [user, profile, locale, tree] = await Promise.all([
    getCurrentUser(),
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
          user
            ? (profile?.full_name?.trim() || user.email || 'S')
                .slice(0, 1)
                .toLocaleUpperCase('tr-TR')
            : null
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
