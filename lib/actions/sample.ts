'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import type { ActionState } from '@/lib/types'
import { emptyToUndefined, failure, invalid } from './shared'

const RequestSchema = z.object({
  company_id: z.uuid(),
  product_id: z.uuid().optional(),
  quantity: z.coerce.number().int().positive().max(100),
  message: z.string().trim().max(1000).optional(),
  shipping_address: z.string().trim().min(10, 'Teslimat adresi girin.').max(500),
})

export async function requestSample(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return failure('Numune istemek için giriş yapmalısınız.')

  const parsed = RequestSchema.safeParse({
    company_id: formData.get('company_id'),
    product_id: emptyToUndefined(formData.get('product_id')),
    quantity: emptyToUndefined(formData.get('quantity')) ?? '1',
    message: emptyToUndefined(formData.get('message')),
    shipping_address: emptyToUndefined(formData.get('shipping_address')),
  })
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase
    .from('sample_requests')
    .insert({ ...parsed.data, buyer_id: user.id })

  if (error) return failure(`Talep gönderilemedi: ${error.message}`)

  revalidatePath('/', 'layout')
  return { status: 'success', message: 'Numune talebiniz iletildi.' }
}

const DecisionSchema = z.object({
  id: z.uuid(),
  status: z.enum(['approved', 'rejected', 'sent']),
})

export async function decideSample(formData: FormData): Promise<void> {
  const parsed = DecisionSchema.safeParse({
    id: formData.get('id'),
    status: formData.get('status'),
  })
  if (!parsed.success) return

  const supabase = await createClient()
  // RLS yalnızca talebin taraflarına izin verir.
  await supabase
    .from('sample_requests')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.id)

  revalidatePath('/', 'layout')
}
