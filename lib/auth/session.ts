import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'
import type { Company, Profile } from '@/lib/types'

/**
 * İstek başına tek sorgu: aynı render ağacında kaç kez çağrılırsa çağrılsın
 * Supabase'e bir kez gidilir.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  return data
})

/** Kullanıcının sahibi olduğu firmalar — tedarikçi akışlarının giriş noktası. */
export const getMyCompanies = cache(async (): Promise<Company[]> => {
  const user = await getCurrentUser()
  if (!user) return []

  const supabase = await createClient()
  const { data } = await supabase
    .from('companies')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })

  return data ?? []
})

export const getPrimaryCompany = cache(async (): Promise<Company | null> => {
  const companies = await getMyCompanies()
  return companies[0] ?? null
})

export async function isAdmin() {
  const profile = await getCurrentProfile()
  return profile?.role === 'admin'
}
