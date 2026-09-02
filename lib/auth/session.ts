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

/**
 * Oturumdaki kullanıcının profil satırı.
 *
 * Satır normalde `on_auth_user_created` tetiğiyle kayıt anında oluşur.
 * Ama tetik eklenmeden önce açılmış hesaplarda ya da tetik bir kez
 * başarısız olduğunda satır olmuyor; o kullanıcı giriş yapmış olmasına
 * rağmen uygulamanın her yerinde "profilsiz" görünüyordu.
 *
 * Eksikse burada tamamlanır: kimlik zaten doğrulanmış, tek eksik olan
 * uygulama tarafındaki kayıt. RLS yalnızca kendi satırını yazmasına
 * izin veriyor.
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (data) return data

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const { data: created } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      full_name:
        typeof meta.full_name === 'string' && meta.full_name.trim()
          ? meta.full_name.trim()
          : null,
      phone: typeof meta.phone === 'string' ? meta.phone : (user.phone ?? null),
      role: typeof meta.role === 'string' ? meta.role : 'buyer',
    })
    .select('*')
    .maybeSingle()

  return created ?? null
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
