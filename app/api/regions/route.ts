import { NextResponse } from 'next/server'

import { getDistricts, getProvinces } from '@/lib/queries/geo'

/**
 * Kademeli adres seçiminin veri ucu.
 *
 * 973 ilçenin tamamını her form yüklemesinde istemciye göndermek yerine
 * seçilen ilin ilçeleri istenir. Referans veri olduğu için uzun süre
 * önbelleklenebilir; değiştiğinde göç yazılır.
 *
 *   /api/regions?country=TR   → iller
 *   /api/regions?parent=<id>  → o ilin ilçeleri
 */
export const revalidate = 86400

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const parent = searchParams.get('parent')
  const country = searchParams.get('country')

  // UUID dışındaki girdi sorguya hiç ulaşmasın.
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  if (parent) {
    if (!UUID.test(parent)) {
      return NextResponse.json({ items: [] }, { status: 400 })
    }
    return NextResponse.json({ items: await getDistricts(parent) })
  }

  if (country && /^[A-Z]{2}$/.test(country)) {
    return NextResponse.json({ items: await getProvinces(country) })
  }

  return NextResponse.json({ items: [] }, { status: 400 })
}
