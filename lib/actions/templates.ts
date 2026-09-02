'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import type { ActionState } from '@/lib/types'
import { emptyToUndefined, failure, invalid } from './shared'

const CreateSchema = z.object({
  name: z.string().trim().min(2, 'Şablona bir ad verin.').max(120),
  note: z.string().trim().max(500).optional(),
  repeat_days: z.coerce.number().int().min(1).max(365).optional(),
})

/**
 * Düzenli sipariş şablonu oluşturur.
 *
 * Perakendeci her ay büyük ölçüde aynı listeyi alır. Listeyi her
 * seferinde yeniden kurmak, platformu bırakıp tedarikçiyi doğrudan
 * aramanın en yaygın sebebi.
 */
export async function createTemplate(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return failure('Bu işlem için giriş yapmalısınız.')

  const parsed = CreateSchema.safeParse({
    name: emptyToUndefined(formData.get('name')),
    note: emptyToUndefined(formData.get('note')),
    repeat_days: emptyToUndefined(formData.get('repeat_days')),
  })
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase
    .from('order_templates')
    .insert({ ...parsed.data, owner_id: user.id })

  if (error) return failure(`Şablon oluşturulamadı: ${error.message}`)
  revalidatePath('/', 'layout')
  return { status: 'success', message: 'Şablon oluşturuldu.' }
}

const ItemSchema = z.object({
  template_id: z.uuid(),
  product_id: z.uuid(),
  quantity: z.coerce.number().int().positive('Adet pozitif olmalı.'),
})

/** Şablona ürün ekler; aynı ürün ikinci kez eklenirse adet güncellenir. */
export async function addTemplateItem(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = ItemSchema.safeParse({
    template_id: formData.get('template_id'),
    product_id: formData.get('product_id'),
    quantity: formData.get('quantity'),
  })
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  // RLS şablonun sahibi olmayanı zaten durdurur.
  const { error } = await supabase
    .from('order_template_items')
    .upsert(parsed.data, { onConflict: 'template_id,product_id' })

  if (error) return failure(`Eklenemedi: ${error.message}`)
  revalidatePath('/', 'layout')
  return { status: 'success' }
}

const DeleteSchema = z.object({ id: z.uuid() })

export async function deleteTemplate(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = DeleteSchema.safeParse({ id: formData.get('id') })
  if (!parsed.success) return invalid(parsed.error, 'Geçersiz istek.')

  const supabase = await createClient()
  const { error } = await supabase
    .from('order_templates')
    .delete()
    .eq('id', parsed.data.id)

  if (error) return failure(`Silinemedi: ${error.message}`)
  revalidatePath('/', 'layout')
  return { status: 'success', message: 'Şablon silindi.' }
}

export async function removeTemplateItem(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = DeleteSchema.safeParse({ id: formData.get('id') })
  if (!parsed.success) return invalid(parsed.error, 'Geçersiz istek.')

  const supabase = await createClient()
  const { error } = await supabase
    .from('order_template_items')
    .delete()
    .eq('id', parsed.data.id)

  if (error) return failure(`Silinemedi: ${error.message}`)
  revalidatePath('/', 'layout')
  return { status: 'success' }
}

/**
 * Şablonu teklif talebine dönüştürür.
 *
 * Şablon tek başına bir sipariş değildir: fiyatlar değişmiş, stok
 * bitmiş olabilir. Bu yüzden doğrudan sipariş açmak yerine talep
 * oluşturulur ve tedarikçiler güncel fiyatla döner.
 */
export async function touchTemplate(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = DeleteSchema.safeParse({ id: formData.get('id') })
  if (!parsed.success) return invalid(parsed.error, 'Geçersiz istek.')

  const supabase = await createClient()
  await supabase
    .from('order_templates')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', parsed.data.id)

  revalidatePath('/', 'layout')
  return { status: 'success' }
}
