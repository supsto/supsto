import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'

/** Ana sayfadaki güven şeridi. Gerçek sayımlar — uydurma rakam yok. */
export const getPlatformStats = cache(async () => {
  const supabase = await createClient()

  const [companies, verified, products, openRfqs, cities] = await Promise.all([
    supabase.from('companies').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('companies').select('id', { count: 'exact', head: true }).eq('verified', true),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('rfqs').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('companies').select('city').eq('status', 'active').not('city', 'is', null),
  ])

  const cityCount = new Set((cities.data ?? []).map((r) => r.city)).size

  return {
    companies: companies.count ?? 0,
    verifiedCompanies: verified.count ?? 0,
    products: products.count ?? 0,
    openRfqs: openRfqs.count ?? 0,
    cities: cityCount,
  }
})
