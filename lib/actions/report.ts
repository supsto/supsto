'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getCurrentUser, isAdmin } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import type { ActionState } from '@/lib/types'
import { emptyToUndefined, failure, invalid } from './shared'

const REASONS = ['spam', 'counterfeit', 'misleading', 'offensive', 'wrong_category', 'other'] as const

const Schema = z.object({
  product_id: z.uuid().optional(),
  company_id: z.uuid().optional(),
  rfq_id: z.uuid().optional(),
  reason: z.enum(REASONS),
  detail: z.string().trim().max(1000).optional(),
})

export async function submitReport(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return failure('Bildirmek için giriş yapmalısınız.')

  const parsed = Schema.safeParse({
    product_id: emptyToUndefined(formData.get('product_id')),
    company_id: emptyToUndefined(formData.get('company_id')),
    rfq_id: emptyToUndefined(formData.get('rfq_id')),
    reason: formData.get('reason'),
    detail: emptyToUndefined(formData.get('detail')),
  })
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase
    .from('reports')
    .insert({ ...parsed.data, reporter_id: user.id })

  if (error) {
    // Kısmi tekil indeks: aynı kişi aynı hedefi tekrar bildiremez.
    if (error.code === '23505') return failure('Bu içeriği zaten bildirdiniz.')
    return failure(error.message)
  }

  return { status: 'success', message: 'Bildiriminiz alındı. İnceleyeceğiz.' }
}

const ResolveSchema = z.object({
  id: z.uuid(),
  status: z.enum(['reviewing', 'resolved', 'dismissed']),
  resolution_note: z.string().trim().max(500).optional(),
})

export async function resolveReport(formData: FormData): Promise<void> {
  if (!(await isAdmin())) return

  const user = await getCurrentUser()
  const parsed = ResolveSchema.safeParse({
    id: formData.get('id'),
    status: formData.get('status'),
    resolution_note: emptyToUndefined(formData.get('resolution_note')),
  })
  if (!parsed.success) return

  const supabase = await createClient()
  await supabase
    .from('reports')
    .update({
      status: parsed.data.status,
      resolution_note: parsed.data.resolution_note,
      reviewed_by: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.id)

  revalidatePath('/', 'layout')
}
