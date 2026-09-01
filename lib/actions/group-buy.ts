'use server'

import { revalidatePath } from 'next/cache'
import { getLocale } from 'next-intl/server'
import { z } from 'zod'

import { redirect } from '@/i18n/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import type { ActionState } from '@/lib/types'
import { emptyToUndefined, failure, invalid } from './shared'

const CreateSchema = z.object({
  product_id: z.uuid(),
  target_quantity: z.coerce.number().int().positive('Hedef miktar pozitif olmalı.'),
  quantity: z.coerce.number().int().positive('Kendi taahhüdünüzü girin.'),
  deadline: z.iso.date('Geçerli bir tarih girin.'),
  note: z.string().trim().max(500).optional(),
})

/**
 * Havuzu açan kişi ilk katılımcıdır — "aç ve kaybol" senaryosunu
 * engeller, havuz her zaman en az bir taahhütle başlar.
 */
export async function createGroupBuy(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return failure('Havuz açmak için giriş yapmalısınız.')

  const parsed = CreateSchema.safeParse({
    product_id: formData.get('product_id'),
    target_quantity: emptyToUndefined(formData.get('target_quantity')),
    quantity: emptyToUndefined(formData.get('quantity')),
    deadline: emptyToUndefined(formData.get('deadline')),
    note: emptyToUndefined(formData.get('note')),
  })
  if (!parsed.success) return invalid(parsed.error)

  const { product_id, target_quantity, quantity, deadline, note } = parsed.data
  if (quantity > target_quantity) {
    return failure('Taahhüdünüz hedeften büyük olamaz — havuza gerek yok, doğrudan sipariş verebilirsiniz.')
  }

  const supabase = await createClient()
  const { data: product } = await supabase
    .from('products')
    .select('id, currency, price')
    .eq('id', product_id)
    .maybeSingle()
  if (!product) return failure('Ürün bulunamadı.')

  const { data, error } = await supabase
    .from('group_buys')
    .insert({
      product_id,
      initiator_id: user.id,
      target_quantity,
      deadline,
      note,
      currency: product.currency,
    })
    .select('id')
    .single()
  if (error) return failure(`Havuz açılamadı: ${error.message}`)

  const { error: joinError } = await supabase
    .from('group_buy_participants')
    .insert({ group_buy_id: data.id, buyer_id: user.id, quantity })
  if (joinError) return failure(`Taahhüt kaydedilemedi: ${joinError.message}`)

  revalidatePath('/', 'layout')
  redirect({
    href: { pathname: '/group-buys/[id]', params: { id: data.id } },
    locale: await getLocale(),
  })
}

const JoinSchema = z.object({
  group_buy_id: z.uuid(),
  quantity: z.coerce.number().int().positive('Adet pozitif olmalı.'),
})

export async function joinGroupBuy(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return failure('Katılmak için giriş yapmalısınız.')

  const parsed = JoinSchema.safeParse({
    group_buy_id: formData.get('group_buy_id'),
    quantity: emptyToUndefined(formData.get('quantity')),
  })
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const { data: pool } = await supabase
    .from('group_buys')
    .select('status, deadline')
    .eq('id', parsed.data.group_buy_id)
    .maybeSingle()

  if (!pool) return failure('Havuz bulunamadı.')
  if (pool.status !== 'open' && pool.status !== 'reached') {
    return failure('Bu havuz artık katılıma kapalı.')
  }
  if (new Date(pool.deadline) < new Date()) {
    return failure('Havuzun son katılım tarihi geçti.')
  }

  // upsert: kişi taahhüdünü güncelleyebilsin, ikinci satır açılmasın.
  const { error } = await supabase
    .from('group_buy_participants')
    .upsert(
      { group_buy_id: parsed.data.group_buy_id, buyer_id: user.id, quantity: parsed.data.quantity },
      { onConflict: 'group_buy_id,buyer_id' }
    )

  if (error) return failure(`Katılım kaydedilemedi: ${error.message}`)

  revalidatePath('/', 'layout')
  return { status: 'success' }
}

export async function leaveGroupBuy(formData: FormData): Promise<void> {
  const user = await getCurrentUser()
  if (!user) return
  const id = formData.get('group_buy_id')
  if (typeof id !== 'string') return

  const supabase = await createClient()
  await supabase
    .from('group_buy_participants')
    .delete()
    .eq('group_buy_id', id)
    .eq('buyer_id', user.id)

  revalidatePath('/', 'layout')
}
