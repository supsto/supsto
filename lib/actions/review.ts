'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import type { ActionState } from '@/lib/types'
import { emptyToUndefined, failure, invalid } from './shared'

const Schema = z.object({
  order_id: z.uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  quality_rating: z.coerce.number().int().min(1).max(5).optional(),
  delivery_rating: z.coerce.number().int().min(1).max(5).optional(),
  communication_rating: z.coerce.number().int().min(1).max(5).optional(),
  comment: z.string().trim().min(10, 'Yorum en az 10 karakter olmalı.').max(2000).optional(),
})

/**
 * Değerlendirme yazar. company_id ve author_id GÖNDERİLMEZ — veritabanı
 * tetikleyicisi siparişten türetir, böylece başkası adına ya da başka
 * firmaya yorum yazılamaz.
 */
export async function submitReview(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return failure('Bu işlem için giriş yapmalısınız.')

  const parsed = Schema.safeParse({
    order_id: formData.get('order_id'),
    rating: formData.get('rating'),
    quality_rating: emptyToUndefined(formData.get('quality_rating')),
    delivery_rating: emptyToUndefined(formData.get('delivery_rating')),
    communication_rating: emptyToUndefined(formData.get('communication_rating')),
    comment: emptyToUndefined(formData.get('comment')),
  })
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase.from('reviews').insert({
    ...parsed.data,
    // Tetikleyici bunları siparişten yeniden yazar; tip için gerekli.
    company_id: '00000000-0000-0000-0000-000000000000',
    author_id: user.id,
  })

  if (error) {
    if (error.code === '23505') return failure('Bu siparişi zaten değerlendirdiniz.')
    return failure(error.message)
  }

  revalidatePath('/', 'layout')
  return { status: 'success' }
}

export async function replyToReview(formData: FormData): Promise<void> {
  const id = formData.get('id')
  const reply = formData.get('reply')
  if (typeof id !== 'string' || typeof reply !== 'string' || !reply.trim()) return

  const supabase = await createClient()
  // Tetikleyici tedarikçi dışındakinin yanıt yazmasını engeller.
  await supabase.from('reviews').update({ reply: reply.trim() }).eq('id', id)

  revalidatePath('/', 'layout')
}
