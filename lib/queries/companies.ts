import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'
import { softFail } from './safe'
import type { Company } from '@/lib/types'

export interface CompanyFilters {
  q?: string
  city?: string
  verifiedOnly?: boolean
  limit?: number
  offset?: number
}

export async function searchCompanies(filters: CompanyFilters = {}) {
  const supabase = await createClient()
  const { limit = 24, offset = 0 } = filters

  let query = supabase
    .from('companies')
    .select('*', { count: 'exact' })
    .eq('status', 'active')

  if (filters.q) {
    const term = filters.q.replace(/[(),]/g, ' ').trim()
    if (term) query = query.ilike('name', `%${term}%`)
  }
  if (filters.city) query = query.eq('city', filters.city)
  if (filters.verifiedOnly) query = query.eq('verified', true)

  const { data, count, error } = await query
    .order('verified', { ascending: false })
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) return softFail('searchCompanies', error, { items: [], total: 0 })
  return { items: data ?? [], total: count ?? 0 }
}

export const getFeaturedCompanies = cache(async (limit = 4) => {
  const { items } = await searchCompanies({ verifiedOnly: true, limit })
  return items
})

export const getCompanyBySlug = cache(
  async (slug: string): Promise<Company | null> => {
    const supabase = await createClient()
    const { data } = await supabase
      .from('companies')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()
    return data
  }
)

export async function getCompanyStats(companyId: string) {
  const supabase = await createClient()
  const [{ count: productCount }, { count: quoteCount }] = await Promise.all([
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'active'),
    supabase
      .from('quotes')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId),
  ])

  return { productCount: productCount ?? 0, quoteCount: quoteCount ?? 0 }
}

/** Filtre açılırlarını beslemek için firmaların bulunduğu şehirler. */
export const getCompanyCities = cache(async (): Promise<string[]> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('companies')
    .select('city')
    .eq('status', 'active')
    .not('city', 'is', null)

  return [...new Set((data ?? []).map((r) => r.city).filter((c): c is string => !!c))].sort(
    (a, b) => a.localeCompare(b, 'tr')
  )
})
