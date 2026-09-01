import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'
import type { Company, Profile } from '@/lib/types'
import { getCurrentProfile, getCurrentUser, getMyCompanies } from './session'

export interface PanelContext {
  userId: string
  profile: Profile | null
  companies: Company[]
  company: Company | null
  isSupplier: boolean
  isAdmin: boolean
  unreadMessages: number
  unreadNotifications: number
}

/**
 * Panel sayfalarının ortak bağlamı. `cache` sayesinde layout ve sayfa
 * aynı isteği paylaşır; sayaçlar iki kez sorulmaz.
 */
export const getPanelContext = cache(async (): Promise<PanelContext | null> => {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await createClient()
  const [profile, companies, notifications, messages] = await Promise.all([
    getCurrentProfile(),
    getMyCompanies(),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .is('read_at', null),
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .is('read_at', null)
      .neq('sender_id', user.id),
  ])

  return {
    userId: user.id,
    profile,
    companies,
    company: companies[0] ?? null,
    isSupplier: companies.length > 0,
    isAdmin: profile?.role === 'admin',
    unreadMessages: messages.count ?? 0,
    unreadNotifications: notifications.count ?? 0,
  }
})

/** Tedarikçi bölümleri için: firma yoksa null döner. */
export async function requireCompany() {
  const ctx = await getPanelContext()
  return ctx?.company ?? null
}
