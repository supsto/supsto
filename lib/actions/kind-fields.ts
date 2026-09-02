import 'server-only'

import {
  KINDS,
  PROCUREMENT_METHODS,
  SALES_CHANNELS,
  kindOf,
  FIELD_TYPES,
  type CompanyField,
} from '@/lib/business-kind'

/**
 * Formdan gelen, iş tipine özel alanları okur.
 *
 * Yalnızca SEÇİLEN tipin alanları okunur. Formu elle değiştirip
 * perakendeci hesabına "yıllık üretim" göndermeye çalışan biri, o alanı
 * veritabanına yazdıramaz — beyaz liste tipin tanımından gelir.
 *
 * Dönen nesne doğrudan `companies` güncellemesine verilebilir; yalnızca
 * gerçekten gönderilen alanlar yer alır, gönderilmeyen dokunulmaz.
 */
export function readKindFields(
  formData: FormData,
  kindValue: string | null | undefined
): Record<string, unknown> {
  const kind = kindOf(kindValue)
  if (!kind) return {}

  const out: Record<string, unknown> = { company_kind: kind }

  for (const field of KINDS[kind].fields) {
    const value = extract(formData, field)
    if (value !== undefined) out[field] = value
  }
  return out
}

function extract(formData: FormData, field: CompanyField): unknown {
  const type = FIELD_TYPES[field]

  if (type === 'bool') {
    /*
      Onay kutusu işaretliyse hem gizli "false" hem "true" gelir;
      sonuncusu kazanır. Hiç gelmiyorsa alan formda yoktu, dokunulmaz.
    */
    const all = formData.getAll(field)
    if (all.length === 0) return undefined
    return all.includes('true')
  }

  if (type === 'channels') {
    const picked = formData
      .getAll(field)
      .map(String)
      .filter((v) => (SALES_CHANNELS as readonly string[]).includes(v))
    // Hiç seçilmemesi geçerli bir cevaptır; boş dizi yazılır.
    return picked
  }

  const raw = formData.get(field)
  if (raw === null) return undefined
  const text = String(raw).trim()

  if (type === 'list') {
    if (!text) return []
    return text
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
      .slice(0, 40)
  }

  if (type === 'number') {
    if (!text) return null
    const n = Number(text)
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
  }

  if (type === 'procurement') {
    return (PROCUREMENT_METHODS as readonly string[]).includes(text) ? text : null
  }

  if (type === 'url') {
    if (!text) return null
    try {
      const url = new URL(text)
      // javascript: ve data: adresleri profile yazılmamalı.
      return url.protocol === 'https:' || url.protocol === 'http:' ? text : null
    } catch {
      return null
    }
  }

  return text || null
}
