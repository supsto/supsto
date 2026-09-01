import { cache } from 'react'
import { locale as rootLocale } from 'next/root-params'

import { defaultLocale, locales, type Locale } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import type { Category } from '@/lib/types'

/** Kategorinin bir dildeki adı ve slug'ı. */
export interface CategoryTranslation {
  name: string
  slug: string
}

/** Aktif dile göre çözülmüş kategori; tüm dillerin slug'ını da taşır. */
export interface LocalizedCategory {
  id: string
  parent_id: string | null
  sort_order: number
  /** Kaynak (Türkçe) slug — ürün ilişkileri ve seed bu değere bakar. */
  sourceSlug: string
  name: string
  slug: string
  description: string | null
  translations: Record<Locale, CategoryTranslation>
}

export interface LocalizedCategoryNode extends LocalizedCategory {
  children: LocalizedCategory[]
}

/** Sunucuda aktif dil; root params yoksa varsayılana düşer. */
export const activeLocale = cache(async (): Promise<Locale> => {
  const value = await rootLocale()
  return locales.includes(value as Locale) ? (value as Locale) : defaultLocale
})

type Row = Category & {
  category_translations: {
    locale: string
    name: string
    slug: string
    description: string | null
  }[]
}

function localize(row: Row, locale: Locale): LocalizedCategory {
  const byLocale = new Map(row.category_translations.map((t) => [t.locale, t]))
  const active = byLocale.get(locale)

  const translations = Object.fromEntries(
    locales.map((l) => {
      const t = byLocale.get(l)
      // Çevirisi eksik bir dil, kaynak kayda düşer — sayfa boş kalmasın.
      return [l, { name: t?.name ?? row.name, slug: t?.slug ?? row.slug }]
    })
  ) as Record<Locale, CategoryTranslation>

  return {
    id: row.id,
    parent_id: row.parent_id,
    sort_order: row.sort_order,
    sourceSlug: row.slug,
    name: active?.name ?? row.name,
    slug: active?.slug ?? row.slug,
    description: active?.description ?? row.description,
    translations,
  }
}

const SELECT = '*, category_translations ( locale, name, slug, description )'

export const getCategoryTree = cache(
  async (): Promise<LocalizedCategoryNode[]> => {
    const locale = await activeLocale()
    const supabase = await createClient()
    const { data } = await supabase
      .from('categories')
      .select(SELECT)
      .order('sort_order', { ascending: true })

    const all = ((data ?? []) as Row[]).map((row) => localize(row, locale))
    // Ada göre sıralama dile göre değişir; Türkçe harf sırası için 'tr'.
    const collator = new Intl.Collator(locale)

    return all
      .filter((c) => c.parent_id === null)
      .sort((a, b) => a.sort_order - b.sort_order || collator.compare(a.name, b.name))
      .map((root) => ({
        ...root,
        children: all
          .filter((c) => c.parent_id === root.id)
          .sort((a, b) => a.sort_order - b.sort_order || collator.compare(a.name, b.name)),
      }))
  }
)

/**
 * Slug'ı AKTİF DİLDE çözer. /en/category/packaging ve /tr/kategori/ambalaj
 * aynı kategoriye gider; yanlış dildeki slug bulunamaz (404), böylece
 * yinelenen içerik oluşmaz.
 */
export const getCategoryBySlug = cache(
  async (slug: string): Promise<LocalizedCategoryNode | null> => {
    const locale = await activeLocale()
    const supabase = await createClient()

    const { data: match } = await supabase
      .from('category_translations')
      .select('category_id')
      .eq('locale', locale)
      .eq('slug', slug)
      .maybeSingle()

    if (!match) return null

    const { data } = await supabase
      .from('categories')
      .select(SELECT)
      .eq('id', match.category_id)
      .maybeSingle()

    if (!data) return null
    const category = localize(data as Row, locale)

    const { data: children } = await supabase
      .from('categories')
      .select(SELECT)
      .eq('parent_id', category.id)
      .order('sort_order')

    return {
      ...category,
      children: ((children ?? []) as Row[]).map((row) => localize(row, locale)),
    }
  }
)

/** Her kök kategorinin aktif ürün sayısı. */
export const getCategoryCounts = cache(async (): Promise<Map<string, number>> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('category_id')
    .eq('status', 'active')

  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    if (!row.category_id) continue
    counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1)
  }
  return counts
})
