'use server'

import { revalidatePath } from 'next/cache'
import { getLocale } from 'next-intl/server'
import { z } from 'zod'

import { redirect } from '@/i18n/navigation'
import { getCurrentUser, getMyCompanies } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import type { ActionState } from '@/lib/types'
import { uniqueSlug } from '@/lib/utils'
import { emptyToUndefined, failure, invalid } from './shared'

const INCOTERMS = [
  'EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP',
] as const

const ProductSchema = z.object({
  company_id: z.uuid(),
  title: z.string().trim().min(3, 'Ürün adı en az 3 karakter olmalı.').max(200),
  category_id: z.uuid('Kategori seçin.').optional(),
  description: z.string().trim().max(4000).optional(),
  brand: z.string().trim().max(100).optional(),
  price: z.coerce.number().nonnegative().optional(),
  currency: z.enum(['TRY', 'USD', 'EUR', 'RUB']),
  moq: z.coerce.number().int().positive('MOQ pozitif olmalı.'),
  unit: z.string().trim().max(20).optional(),
  stock_quantity: z.coerce.number().int().nonnegative('Stok negatif olamaz.'),
  price_hidden: z.coerce.boolean(),
  status: z.enum(['active', 'passive', 'draft']),
  // Ticari şartlar
  incoterm: z.enum(INCOTERMS).optional(),
  payment_terms: z.string().trim().max(200).optional(),
  lead_time_days: z.coerce.number().int().positive().max(365).optional(),
  units_per_case: z.coerce.number().int().positive().optional(),
  cases_per_pallet: z.coerce.number().int().positive().optional(),
  hs_code: z.string().trim().max(20).optional(),
  min_order_value: z.coerce.number().nonnegative().optional(),
  sample_available: z.coerce.boolean(),
  sample_price: z.coerce.number().nonnegative().optional(),
  content_language: z.enum(['tr', 'en', 'ru']),
})

function read(formData: FormData) {
  const get = (k: string) => emptyToUndefined(formData.get(k))
  return {
    company_id: formData.get('company_id'),
    title: get('title'),
    category_id: get('category_id'),
    description: get('description'),
    brand: get('brand'),
    price: get('price'),
    currency: get('currency') ?? 'TRY',
    moq: get('moq') ?? '1',
    unit: get('unit'),
    stock_quantity: get('stock_quantity') ?? '0',
    price_hidden: formData.get('price_hidden') === 'on',
    status: get('status') ?? 'draft',
    incoterm: get('incoterm'),
    payment_terms: get('payment_terms'),
    lead_time_days: get('lead_time_days'),
    units_per_case: get('units_per_case'),
    cases_per_pallet: get('cases_per_pallet'),
    hs_code: get('hs_code'),
    min_order_value: get('min_order_value'),
    sample_available: formData.get('sample_available') === 'on',
    sample_price: get('sample_price'),
    content_language: get('content_language') ?? 'tr',
  }
}

/** Kullanıcı gerçekten bu firmanın sahibi mi? RLS de zorlar; bu mesaj içindir. */
async function assertOwnsCompany(companyId: string) {
  const companies = await getMyCompanies()
  return companies.some((c) => c.id === companyId)
}

export async function createProduct(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return failure('Bu işlem için giriş yapmalısınız.')

  const parsed = ProductSchema.safeParse(read(formData))
  if (!parsed.success) return invalid(parsed.error)
  if (!(await assertOwnsCompany(parsed.data.company_id))) {
    return failure('Bu firma adına ürün ekleme yetkiniz yok.')
  }

  const images = formData.getAll('images').filter((v): v is string => typeof v === 'string' && v !== '')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .insert({ ...parsed.data, slug: uniqueSlug(parsed.data.title), images })
    .select('id')
    .single()

  if (error) return failure(`Ürün kaydedilemedi: ${error.message}`)

  revalidatePath('/', 'layout')
  redirect({
    href: { pathname: '/dashboard/products/[id]', params: { id: data.id } },
    locale: await getLocale(),
  })
}

export async function updateProduct(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return failure('Bu işlem için giriş yapmalısınız.')

  const id = formData.get('id')
  if (typeof id !== 'string') return failure('Geçersiz istek.')

  const parsed = ProductSchema.safeParse(read(formData))
  if (!parsed.success) return invalid(parsed.error)
  if (!(await assertOwnsCompany(parsed.data.company_id))) {
    return failure('Bu ürünü düzenleme yetkiniz yok.')
  }

  const images = formData.getAll('images').filter((v): v is string => typeof v === 'string' && v !== '')

  const supabase = await createClient()
  const { error } = await supabase
    .from('products')
    .update({ ...parsed.data, images })
    .eq('id', id)

  if (error) return failure(`Ürün güncellenemedi: ${error.message}`)

  revalidatePath('/', 'layout')
  return { status: 'success', message: 'Ürün kaydedildi.' }
}

export async function deleteProduct(formData: FormData): Promise<void> {
  const id = formData.get('id')
  if (typeof id !== 'string') return

  const supabase = await createClient()
  // RLS yalnızca firma sahibinin silmesine izin verir.
  await supabase.from('products').delete().eq('id', id)

  revalidatePath('/', 'layout')
  redirect({ href: '/dashboard/products', locale: await getLocale() })
}

/* ------------------------------------------------------------------ */
/* Kademeli fiyat                                                      */
/* ------------------------------------------------------------------ */

const TierSchema = z.object({
  product_id: z.uuid(),
  min_quantity: z.coerce.number().int().positive('Minimum adet pozitif olmalı.'),
  max_quantity: z.coerce.number().int().positive().optional(),
  unit_price: z.coerce.number().nonnegative('Fiyat negatif olamaz.'),
  currency: z.enum(['TRY', 'USD', 'EUR', 'RUB']),
})

export async function addPriceTier(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = TierSchema.safeParse({
    product_id: formData.get('product_id'),
    min_quantity: emptyToUndefined(formData.get('min_quantity')),
    max_quantity: emptyToUndefined(formData.get('max_quantity')),
    unit_price: emptyToUndefined(formData.get('unit_price')),
    currency: emptyToUndefined(formData.get('currency')) ?? 'TRY',
  })
  if (!parsed.success) return invalid(parsed.error)

  const { max_quantity, min_quantity } = parsed.data
  if (max_quantity !== undefined && max_quantity < min_quantity) {
    return failure('Maksimum adet, minimumdan küçük olamaz.')
  }

  const supabase = await createClient()
  const { error } = await supabase.from('price_tiers').insert(parsed.data)

  if (error) {
    if (error.code === '23505') return failure('Bu minimum adet için zaten bir kademe var.')
    return failure(`Kademe eklenemedi: ${error.message}`)
  }

  revalidatePath('/', 'layout')
  return { status: 'success', message: 'Kademe eklendi.' }
}

export async function deletePriceTier(formData: FormData): Promise<void> {
  const id = formData.get('id')
  if (typeof id !== 'string') return
  const supabase = await createClient()
  await supabase.from('price_tiers').delete().eq('id', id)
  revalidatePath('/', 'layout')
}
