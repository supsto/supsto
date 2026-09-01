import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'

/**
 * Ana sayfadaki güven şeridi ve veri bandı.
 *
 * Hepsi KENDİ veritabanımızdan gelen doğrulanabilir sayımlardır.
 * Emtia fiyatı, navlun endeksi gibi dış piyasa verileri için beslememiz
 * yok; uydurma rakam alıcının satın alma kararını yanlış bilgiyle
 * etkileyeceği için hiç gösterilmiyor.
 */
export const getPlatformStats = cache(async () => {
  const supabase = await createClient()
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()

  const [companies, verified, products, openRfqs, cities, quotes7d, pools, orders] =
    await Promise.all([
      supabase.from('companies').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('companies').select('id', { count: 'exact', head: true }).eq('verified', true),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('rfqs').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('companies').select('city').eq('status', 'active').not('city', 'is', null),
      /*
        Teklif SAYISI kamuya açık bir pazar sinyali; teklif İÇERİĞİ
        değil. quotes tablosunu saymak anonim ziyaretçide RLS yüzünden
        0 döndürüyordu, bu yüzden rfqs üzerindeki denormalize sayacı
        topluyoruz.
      */
      supabase.from('rfqs').select('quote_count').gte('updated_at', weekAgo),
      supabase
        .from('group_buys')
        .select('id', { count: 'exact', head: true })
        .in('status', ['open', 'reached']),
      // Tamamlanan sipariş hacmi. RLS anonim kullanıcıya sipariş
      // döndürmez; bu yüzden toplam null kalır ve bant o kalemi atlar.
      supabase
        .from('orders')
        .select('total_amount, currency')
        .eq('status', 'completed'),
    ])

  const cityCount = new Set((cities.data ?? []).map((r) => r.city)).size

  // Yalnızca tek para birimindeki toplamı gösteriyoruz; karışık para
  // birimlerini toplamak yanıltıcı olurdu.
  const completed = orders.data ?? []
  const byCurrency = new Map<string, number>()
  for (const row of completed) {
    byCurrency.set(row.currency, (byCurrency.get(row.currency) ?? 0) + Number(row.total_amount))
  }
  const dominant = [...byCurrency.entries()].sort((a, b) => b[1] - a[1])[0]

  return {
    companies: companies.count ?? 0,
    verifiedCompanies: verified.count ?? 0,
    products: products.count ?? 0,
    openRfqs: openRfqs.count ?? 0,
    cities: cityCount,
    quotesLast7Days: (quotes7d.data ?? []).reduce((sum, r) => sum + (r.quote_count ?? 0), 0),
    openPools: pools.count ?? 0,
    completedVolume: dominant ? { amount: dominant[1], currency: dominant[0] } : null,
  }
})
