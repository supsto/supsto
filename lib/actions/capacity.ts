'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getCurrentUser, getPrimaryCompany } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import type { ActionState } from '@/lib/types'
import { emptyToUndefined, failure, invalid } from './shared'

const Schema = z.object({
  title: z.string().trim().min(4, 'Başlık girin.').max(160),
  process: z.string().trim().min(2, 'Hangi işi yapabildiğinizi yazın.').max(120),
  description: z.string().trim().max(1500).optional(),
  available_from: z.iso.date('Başlangıç tarihi geçersiz.'),
  available_to: z.iso.date('Bitiş tarihi geçersiz.'),
  monthly_units: z.coerce.number().int().positive().optional(),
  unit: z.string().trim().max(20).optional(),
  min_batch: z.coerce.number().int().positive().optional(),
  city: z.string().trim().max(60).optional(),
})

/**
 * Boş üretim kapasitesi ilanı açar.
 *
 * Satılan şey ürün değil ZAMAN: fabrikanın önümüzdeki aylarda boş kalan
 * hattı. Bu yüzden stok ya da fiyat kademesi yok; tarih aralığı ve
 * aylık kapasite var.
 */
export async function createCapacityOffer(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return failure('Bu işlem için giriş yapmalısınız.')

  const company = await getPrimaryCompany()
  if (!company) return failure('Önce firmanızı oluşturun.')

  const parsed = Schema.safeParse({
    title: emptyToUndefined(formData.get('title')),
    process: emptyToUndefined(formData.get('process')),
    description: emptyToUndefined(formData.get('description')),
    available_from: emptyToUndefined(formData.get('available_from')),
    available_to: emptyToUndefined(formData.get('available_to')),
    monthly_units: emptyToUndefined(formData.get('monthly_units')),
    unit: emptyToUndefined(formData.get('unit')),
    min_batch: emptyToUndefined(formData.get('min_batch')),
    city: emptyToUndefined(formData.get('city')),
  })
  if (!parsed.success) return invalid(parsed.error)

  if (parsed.data.available_to < parsed.data.available_from) {
    return failure('Bitiş tarihi başlangıçtan önce olamaz.')
  }

  const supabase = await createClient()
  const { error } = await supabase.from('capacity_offers').insert({
    ...parsed.data,
    company_id: company.id,
    // Şehir girilmediyse firmanınki kullanılır; alıcı mesafeye bakar.
    city: parsed.data.city ?? company.city,
  })
  if (error) return failure(`İlan oluşturulamadı: ${error.message}`)

  revalidatePath('/', 'layout')
  return { status: 'success', message: 'Kapasite ilanı yayınlandı.' }
}

const StatusSchema = z.object({
  id: z.uuid(),
  status: z.enum(['open', 'reserved', 'closed']),
})

/** İlanın durumunu değiştirir; RLS yalnızca sahibine izin verir. */
export async function setCapacityStatus(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = StatusSchema.safeParse({
    id: formData.get('id'),
    status: formData.get('status'),
  })
  if (!parsed.success) return invalid(parsed.error, 'Geçersiz istek.')

  const supabase = await createClient()
  const { error } = await supabase
    .from('capacity_offers')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.id)

  if (error) return failure(`Güncellenemedi: ${error.message}`)
  revalidatePath('/', 'layout')
  return { status: 'success' }
}
