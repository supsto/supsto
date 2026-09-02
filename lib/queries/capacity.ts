import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'
import { softFail } from './safe'
import type { Company } from '@/lib/types'
import type { Database } from '@/lib/types/database'

export type CapacityOffer = Database['public']['Tables']['capacity_offers']['Row']

export type CapacityOfferWithCompany = CapacityOffer & {
  company: Pick<
    Company,
    'id' | 'name' | 'slug' | 'city' | 'verified' | 'production_capacity'
  > | null
}

const SELECT = `
  *, company:companies!inner (
    id, name, slug, city, verified, production_capacity
  )
` as const

/**
 * Açık kapasite ilanları.
 *
 * Süresi geçmiş ilanlar listelenmez: fabrikanın geçen ayki boş vardiyası
 * kimsenin işine yaramaz ve listeyi ölü kayıtla doldurur.
 */
export const listOpenCapacity = cache(
  async (filters: { process?: string; city?: string; limit?: number } = {}) => {
    const supabase = await createClient()
    const today = new Date().toISOString().slice(0, 10)

    let query = supabase
      .from('capacity_offers')
      .select(SELECT, { count: 'exact' })
      .eq('status', 'open')
      .gte('available_to', today)
      .order('available_from', { ascending: true })
      .limit(filters.limit ?? 30)

    if (filters.process) query = query.ilike('process', `%${filters.process}%`)
    if (filters.city) query = query.eq('city', filters.city)

    const { data, count, error } = await query
    if (error) return softFail('listOpenCapacity', error, { items: [], total: 0 })
    return {
      items: (data ?? []) as unknown as CapacityOfferWithCompany[],
      total: count ?? 0,
    }
  }
)

/** Firmanın kendi ilanları; kapalı ve süresi geçmiş olanlar dahil. */
export const listCompanyCapacity = cache(async (companyId: string) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('capacity_offers')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (error) return softFail('listCompanyCapacity', error, [])
  return data ?? []
})

/** İlan süresi doldu mu? Listeleme sorgusu bunu zaten eler; arayüz de göstermeli. */
export function isExpired(offer: Pick<CapacityOffer, 'available_to'>) {
  return offer.available_to < new Date().toISOString().slice(0, 10)
}
