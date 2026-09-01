import { locale as getLocale } from 'next/root-params'

import { getCurrentProfile } from '@/lib/auth/session'
import { defaultLocale, type Locale } from '@/i18n/routing'
import { SiteHeaderShell } from './site-header-shell'

/** Oturum verisini sunucuda okur; görünümü istemci kabuğuna devreder. */
export async function SiteHeader() {
  const [profile, locale] = await Promise.all([getCurrentProfile(), getLocale()])

  return (
    <SiteHeaderShell
      locale={(locale as Locale) ?? defaultLocale}
      userInitial={
        profile ? (profile.full_name ?? 'S').slice(0, 1).toLocaleUpperCase('tr-TR') : null
      }
    />
  )
}
