import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'
import type { Quote, Rfq, RfqListItem } from '@/lib/types'

export interface RfqFilters {
  q?: string
  categoryIds?: string[]
  city?: string
  status?: 'open' | 'closed' | 'all'
  buyerId?: string
  limit?: number
  offset?: number
}

export async function searchRfqs(filters: RfqFilters = {}) {
  const supabase = await createClient()
  const { limit = 20, offset = 0, status = 'open' } = filters

  let query = supabase
    .from('rfqs')
    // quote_count denormalize bir kolon: teklif SAYISI herkese açık,
    // teklif İÇERİĞİ RLS ile korunuyor. `quotes(count)` kullanılsaydı
    // anonim ziyaretçi her RFQ'yu "0 teklif" görürdü.
    .select(
      `id, title, quantity, unit, city, status, deadline, created_at,
       target_price, quote_count,
       category:categories ( id, name, slug )`,
      { count: 'exact' }
    )

  if (status !== 'all') query = query.eq('status', status)
  if (filters.buyerId) query = query.eq('buyer_id', filters.buyerId)
  if (filters.city) query = query.eq('city', filters.city)
  if (filters.categoryIds?.length) query = query.in('category_id', filters.categoryIds)
  if (filters.q) {
    const term = filters.q.replace(/[(),]/g, ' ').trim()
    if (term) query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`)
  }

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error

  return { items: (data ?? []) as RfqListItem[], total: count ?? 0 }
}

export const getRecentRfqs = cache(async (limit = 4) => {
  const { items } = await searchRfqs({ limit })
  return items
})

export const getRfqById = cache(async (id: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('rfqs')
    .select('*, category:categories ( id, name, slug )')
    .eq('id', id)
    .maybeSingle()

  return data as (Rfq & { category: { id: string; name: string; slug: string } | null }) | null
})

/**
 * RFQ'nun teklifleri. RLS gereği yalnızca RFQ sahibi ve teklifi veren firma
 * kendi satırını görür; bu yüzden çağıranın rolüne göre farklı sonuç döner.
 */
export async function getRfqQuotes(rfqId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('quotes')
    .select('*, company:companies ( id, name, slug, city, verified )')
    .eq('rfq_id', rfqId)
    .order('price', { ascending: true })

  return (data ?? []) as (Quote & {
    company: { id: string; name: string; slug: string; city: string | null; verified: boolean } | null
  })[]
}

/** Herkese açık teklif sayısı — RLS'in gizlediği satırları saymaya çalışmaz. */
export async function countRfqQuotes(rfqId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('rfqs')
    .select('quote_count')
    .eq('id', rfqId)
    .maybeSingle()
  return data?.quote_count ?? 0
}

/** Bu firma bu RFQ'ya daha önce teklif verdi mi? */
export async function getExistingQuote(rfqId: string, companyId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('quotes')
    .select('*')
    .eq('rfq_id', rfqId)
    .eq('company_id', companyId)
    .maybeSingle()
  return data
}
