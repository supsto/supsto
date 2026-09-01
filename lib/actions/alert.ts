'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import type { ActionState } from '@/lib/types'
import { emptyToUndefined, failure, invalid } from './shared'

const Schema = z.object({
  product_id: z.uuid(),
  kind: z.enum(['price_below', 'back_in_stock']),
  target_price: z.coerce.number().positive().optional(),
})

export async function createAlert(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return failure('Alarm kurmak için giriş yapmalısınız.')

  const parsed = Schema.safeParse({
    product_id: formData.get('product_id'),
    kind: formData.get('kind'),
    target_price: emptyToUndefined(formData.get('target_price')),
  })
  if (!parsed.success) return invalid(parsed.error)

  if (parsed.data.kind === 'price_below' && !parsed.data.target_price) {
    return failure('Hedef fiyat girin.')
  }

  const supabase = await createClient()
  // upsert: aynı ürün+tür için ikinci alarm açılmasın, hedef güncellensin.
  const { error } = await supabase.from('product_alerts').upsert(
    { ...parsed.data, user_id: user.id, active: true, triggered_at: null },
    { onConflict: 'user_id,product_id,kind' }
  )

  if (error) return failure(error.message)

  revalidatePath('/', 'layout')
  return { status: 'success' }
}

export async function deleteAlert(formData: FormData): Promise<void> {
  const id = formData.get('id')
  if (typeof id !== 'string') return
  const supabase = await createClient()
  await supabase.from('product_alerts').delete().eq('id', id)
  revalidatePath('/', 'layout')
}
