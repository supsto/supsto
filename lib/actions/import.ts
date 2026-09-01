'use server'

import { revalidatePath } from 'next/cache'

import { getMyCompanies } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import type { ActionState } from '@/lib/types'
import { uniqueSlug } from '@/lib/utils'
import { failure } from './shared'

export interface ImportRow {
  title: string
  category_slug?: string
  description?: string
  brand?: string
  price?: number
  currency?: string
  moq?: number
  unit?: string
  stock_quantity?: number
}

export interface RowError {
  row: number
  message: string
}

const REQUIRED_HEADER = 'title'

/**
 * CSV'yi satır satır doğrular ve geçerli olanları ekler.
 *
 * Tümü-veya-hiç değil: 500 satırlık dosyada tek hatalı satır yüzünden
 * hepsini reddetmek tedarikçiyi kilitler. Hatalı satırlar raporlanır,
 * geçerliler yazılır.
 */
export async function importProducts(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const companyId = formData.get('company_id')
  const csv = formData.get('csv')
  if (typeof companyId !== 'string' || typeof csv !== 'string' || !csv.trim()) {
    return failure('Dosya okunamadı.')
  }

  const companies = await getMyCompanies()
  if (!companies.some((c) => c.id === companyId)) {
    return failure('Bu firma adına ürün yükleyemezsiniz.')
  }

  const lines = csv.trim().split(/\r?\n/)
  const header = lines[0]?.split(',').map((h) => h.trim().toLowerCase()) ?? []
  if (!header.includes(REQUIRED_HEADER)) {
    return failure('Dosyada zorunlu "title" sütunu yok.')
  }

  const supabase = await createClient()
  const { data: categories } = await supabase.from('categories').select('id, slug')
  const categoryBySlug = new Map((categories ?? []).map((c) => [c.slug, c.id]))

  const errors: RowError[] = []
  const rows: Record<string, unknown>[] = []

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i])
    if (cells.every((c) => !c.trim())) continue

    const get = (name: string) => {
      const index = header.indexOf(name)
      return index === -1 ? undefined : cells[index]?.trim() || undefined
    }

    const title = get('title')
    if (!title) {
      errors.push({ row: i + 1, message: 'title boş' })
      continue
    }

    const moq = Number(get('moq') ?? 1)
    const stock = Number(get('stock_quantity') ?? 0)
    const price = get('price') ? Number(get('price')) : undefined

    if (!Number.isFinite(moq) || moq < 1) {
      errors.push({ row: i + 1, message: 'moq geçersiz' })
      continue
    }
    if (!Number.isFinite(stock) || stock < 0) {
      errors.push({ row: i + 1, message: 'stock_quantity geçersiz' })
      continue
    }
    if (price !== undefined && (!Number.isFinite(price) || price < 0)) {
      errors.push({ row: i + 1, message: 'price geçersiz' })
      continue
    }

    const categorySlug = get('category_slug')
    if (categorySlug && !categoryBySlug.has(categorySlug)) {
      errors.push({ row: i + 1, message: `kategori bulunamadı: ${categorySlug}` })
      continue
    }

    rows.push({
      company_id: companyId,
      title,
      slug: uniqueSlug(title),
      description: get('description'),
      brand: get('brand'),
      category_id: categorySlug ? categoryBySlug.get(categorySlug) : null,
      price: price ?? null,
      currency: (get('currency') ?? 'TRY').toUpperCase(),
      moq: Math.trunc(moq),
      unit: get('unit') ?? 'adet',
      stock_quantity: Math.trunc(stock),
      status: 'draft',
    })
  }

  let inserted = 0
  if (rows.length > 0) {
    const { error, count } = await supabase
      .from('products')
      .insert(rows as never, { count: 'exact' })
    if (error) return failure(`İçe aktarma başarısız: ${error.message}`)
    inserted = count ?? rows.length
  }

  await supabase.from('import_jobs').insert({
    company_id: companyId,
    created_by: companies[0].owner_id,
    filename: String(formData.get('filename') ?? 'import.csv'),
    total_rows: lines.length - 1,
    ok_rows: inserted,
    failed_rows: errors.length,
    status: 'completed',
    errors: errors as never,
    finished_at: new Date().toISOString(),
  })

  revalidatePath('/', 'layout')

  return {
    status: 'success',
    message:
      errors.length > 0
        ? `${inserted} ürün taslak olarak eklendi, ${errors.length} satır atlandı.`
        : `${inserted} ürün taslak olarak eklendi.`,
  }
}

/** Tırnak içindeki virgülleri koruyan basit CSV satır ayrıştırıcı. */
function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      out.push(current)
      current = ''
    } else {
      current += char
    }
  }
  out.push(current)
  return out
}
