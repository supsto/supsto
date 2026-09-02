import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'
import { softFail } from './safe'

export interface CountryOption {
  code: string
  name: string
}

export interface RegionOption {
  id: string
  name: string
  code: string | null
}

const NAME_COLUMN: Record<string, 'name_tr' | 'name_en' | 'name_ru'> = {
  tr: 'name_tr',
  en: 'name_en',
  ru: 'name_ru',
}

/**
 * Ülke listesi, izleyicinin dilinde.
 *
 * Referans veri olduğu için istek başına bir kez okunur; sıralamada
 * Türkiye başta (sort_order), gerisi alfabetik.
 */
export const getCountries = cache(async (locale: string): Promise<CountryOption[]> => {
  const column = NAME_COLUMN[locale] ?? 'name_en'
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('countries')
    .select(`code, ${column}`)
    .order('sort_order')
    .order(column)

  if (error) return softFail('getCountries', error, [])
  return (data ?? []).map((row) => ({
    code: row.code,
    name: (row as unknown as Record<string, string>)[column],
  }))
})

/** Bir ülkenin illeri. Veri girilmemiş ülkeler boş dizi döndürür. */
export const getProvinces = cache(
  async (countryCode: string): Promise<RegionOption[]> => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('regions')
      .select('id, name, code')
      .eq('country_code', countryCode)
      .eq('level', 1)
      .order('name')

    if (error) return softFail('getProvinces', error, [])
    return data ?? []
  }
)

/** Bir ilin ilçeleri. */
export const getDistricts = cache(
  async (provinceId: string): Promise<RegionOption[]> => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('regions')
      .select('id, name, code')
      .eq('parent_id', provinceId)
      .eq('level', 2)
      .order('name')

    if (error) return softFail('getDistricts', error, [])
    return data ?? []
  }
)
