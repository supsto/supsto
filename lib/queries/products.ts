import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'
import { softFail } from './safe'
import type { PriceTier, ProductDetail, ProductListItem } from '@/lib/types'

const LIST_SELECT = `
  id, title, slug, price, currency, moq, unit, stock_quantity, price_hidden,
  images, created_at, incoterm, lead_time_days, production_type,
  sample_available, hs_code,
  company:companies!inner ( id, name, slug, city, district, verified ),
  category:categories ( id, name, slug ),
  price_tiers ( min_quantity, max_quantity, unit_price, currency )
` as const

/**
 * Arama terimini sınıflandırır.
 *
 * B2B alıcı çoğu zaman serbest metinle değil KODLA arar. Kullanıcıyı
 * ayrı bir "arama tipi" menüsüyle uğraştırmak yerine biçimden anlıyoruz:
 *   · 6–12 hane, nokta içerebilir → GTİP/HS kodu
 *   · 10 veya 11 hane, saf rakam → vergi kimlik / TC no
 *   · diğer her şey            → serbest metin
 */
export type SearchKind = 'text' | 'hs' | 'tax'

export function classifySearch(raw: string): { kind: SearchKind; value: string } {
  const value = raw.trim()
  const digits = value.replace(/[.\s]/g, '')

  if (/^\d{10,11}$/.test(digits)) return { kind: 'tax', value: digits }
  if (/^\d{6,12}$/.test(digits) && /[.]/.test(value)) return { kind: 'hs', value: digits }
  if (/^\d{6,12}$/.test(digits)) return { kind: 'hs', value: digits }
  return { kind: 'text', value }
}

export interface ProductFilters {
  q?: string
  categoryIds?: string[]
  city?: string
  companyId?: string
  verifiedOnly?: boolean
  maxMoq?: number
  inStock?: boolean
  minPrice?: number
  maxPrice?: number
  maxLeadTime?: number
  /** Incoterms 2020 kodları; products.incoterm kısıtıyla aynı küme. */
  incoterms?: string[]
  /** 'oem' | 'odm' | 'stock' */
  productionTypes?: string[]
  /** company_certificates.kind değerleri; hepsine birden sahip olma şartı DEĞİL. */
  certificates?: string[]
  sort?: 'relevant' | 'newest' | 'price-asc' | 'price-desc' | 'capacity'
  limit?: number
  offset?: number
}

/**
 * Sertifika filtresi için firma kimlikleri.
 *
 * Ürün sorgusuna gömülü join ile yazılabilirdi ama PostgREST'te iç içe
 * `!inner` filtreleri sessizce tüm sonucu eleyebiliyor. Önce firmaları
 * bulmak hem okunur hem de davranışı öngörülebilir kılıyor.
 */
async function companiesWithCertificates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  kinds: string[]
): Promise<string[] | null> {
  const { data, error } = await supabase
    .from('company_certificates')
    .select('company_id')
    .in('kind', kinds)
    .eq('verified', true)

  if (error) return softFail('companiesWithCertificates', error, null)
  return [...new Set((data ?? []).map((r) => r.company_id))]
}

export async function searchProducts(filters: ProductFilters = {}) {
  const supabase = await createClient()
  const { limit = 24, offset = 0 } = filters

  let query = supabase
    .from('products')
    .select(LIST_SELECT, { count: 'exact' })
    .eq('status', 'active')

  if (filters.q) {
    // PostgREST'te `or` içindeki değerlerde virgül ve parantez ayraçtır.
    const term = filters.q.replace(/[(),]/g, ' ').trim()
    if (term) {
      const { kind, value } = classifySearch(term)
      if (kind === 'hs') {
        /*
          Yalnızca normalize kolona bakılır: alıcı "4819.10" da yazsa
          "481910" da yazsa aynı ürüne ulaşır. Başlıkta rakam aramak
          gürültü yaratacağı için serbest metne düşülmez.
        */
        query = query.ilike('hs_code_digits', `${value}%`)
      } else if (kind === 'tax') {
        query = query.eq('companies.tax_number', value)
      } else {
        query = query.or(
          `title.ilike.%${term}%,description.ilike.%${term}%,brand.ilike.%${term}%`
        )
      }
    }
  }
  if (filters.categoryIds?.length) query = query.in('category_id', filters.categoryIds)
  if (filters.companyId) query = query.eq('company_id', filters.companyId)
  if (filters.city) query = query.eq('companies.city', filters.city)
  if (filters.verifiedOnly) query = query.eq('companies.verified', true)
  if (filters.maxMoq) query = query.lte('moq', filters.maxMoq)
  if (filters.inStock) query = query.gt('stock_quantity', 0)
  if (filters.maxLeadTime) query = query.lte('lead_time_days', filters.maxLeadTime)
  if (filters.incoterms?.length) query = query.in('incoterm', filters.incoterms)
  if (filters.productionTypes?.length) {
    query = query.in('production_type', filters.productionTypes)
  }

  /*
    Fiyatı gizli ürünler fiyat filtresinin dışında kalır: "500 TL altı"
    diyen alıcıya fiyatı bilinmeyen ürünü göstermek yanıltıcı olur.
  */
  if (filters.minPrice != null || filters.maxPrice != null) {
    query = query.eq('price_hidden', false)
    if (filters.minPrice != null) query = query.gte('price', filters.minPrice)
    if (filters.maxPrice != null) query = query.lte('price', filters.maxPrice)
  }

  if (filters.certificates?.length) {
    const ids = await companiesWithCertificates(supabase, filters.certificates)
    // Hiç eşleşme yoksa boş sonuç doğru cevaptır; filtreyi atlamak yanlış olur.
    if (!ids?.length) return { items: [], total: 0 }
    query = query.in('company_id', ids)
  }

  switch (filters.sort) {
    case 'price-asc':
      query = query.order('price', { ascending: true, nullsFirst: false })
      break
    case 'price-desc':
      query = query.order('price', { ascending: false, nullsFirst: false })
      break
    case 'capacity':
      query = query.order('annual_output_units', {
        referencedTable: 'companies',
        ascending: false,
        nullsFirst: false,
      })
      break
    default:
      /*
        Varsayılan sıralama açık bir kuraldır, gizemli bir "akıllı
        eşleşme" değil: önce doğrulanmış tedarikçi, sonra stoktaki ürün,
        sonra yeni eklenen. Davranış verisi biriktiğinde gerçek bir
        alaka sıralaması buraya gelebilir; o güne kadar kullanıcıya
        olmayan bir zekâ vaat etmiyoruz.
      */
      query = query
        .order('verified', { referencedTable: 'companies', ascending: false })
        .order('stock_quantity', { ascending: false })
        .order('created_at', { ascending: false })
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1)
  if (error) return softFail('searchProducts', error, { items: [], total: 0 })

  return {
    items: (data ?? []) as unknown as ProductListItem[],
    total: count ?? 0,
  }
}

export const getFeaturedProducts = cache(async (limit = 4) => {
  const { items } = await searchProducts({ inStock: true, limit })
  return items
})

export const getProductBySlug = cache(
  async (slug: string): Promise<ProductDetail | null> => {
    const supabase = await createClient()
    const { data } = await supabase
      .from('products')
      .select(
        `*, company:companies ( * ), category:categories ( id, name, slug ),
         price_tiers ( * ),
         product_variants ( id, axis1_value, axis2_value, sku, stock_quantity, price_delta )`
      )
      .eq('slug', slug)
      .maybeSingle()

    if (!data) return null

    const detail = data as unknown as ProductDetail
    detail.price_tiers = [...(detail.price_tiers ?? [])].sort(
      (a, b) => a.min_quantity - b.min_quantity
    )
    return detail
  }
)

/** Verilen adet için geçerli kademe. Kademe yoksa taban fiyat kullanılır. */
export function resolveTierPrice(tiers: PriceTier[], quantity: number) {
  let match: PriceTier | null = null
  for (const tier of tiers) {
    const withinMin = quantity >= tier.min_quantity
    const withinMax = tier.max_quantity === null || quantity <= tier.max_quantity
    if (withinMin && withinMax) match = tier
  }
  return match
}

export async function getRelatedProducts(product: ProductDetail, limit = 4) {
  if (!product.category_id) return []
  const { items } = await searchProducts({
    categoryIds: [product.category_id],
    limit: limit + 1,
  })
  return items.filter((p) => p.id !== product.id).slice(0, limit)
}
