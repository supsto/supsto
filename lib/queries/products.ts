import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'
import { softFail } from './safe'
import type { PriceTier, ProductDetail, ProductListItem } from '@/lib/types'

const LIST_SELECT = `
  id, title, slug, price, currency, moq, unit, stock_quantity, price_hidden,
  images, created_at,
  company:companies!inner ( id, name, slug, city, district, verified ),
  category:categories ( id, name, slug )
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
  sort?: 'relevant' | 'newest' | 'price-asc' | 'price-desc'
  limit?: number
  offset?: number
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

  switch (filters.sort) {
    case 'price-asc':
      query = query.order('price', { ascending: true, nullsFirst: false })
      break
    case 'price-desc':
      query = query.order('price', { ascending: false, nullsFirst: false })
      break
    default:
      query = query.order('created_at', { ascending: false })
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
         price_tiers ( * )`
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
