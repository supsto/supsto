'use server'

import { revalidatePath } from 'next/cache'
import { getLocale } from 'next-intl/server'
import { z } from 'zod'

import { redirect } from '@/i18n/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import type { ActionState } from '@/lib/types'
import { emptyToUndefined, failure, invalid } from './shared'

const StartSchema = z.object({
  company_id: z.uuid(),
  product_id: z.uuid().optional(),
  rfq_id: z.uuid().optional(),
  body: z.string().trim().min(1, 'Mesaj boş olamaz.').max(4000),
})

/**
 * Ürün veya RFQ bağlamında görüşme başlatır. Aynı bağlamda konuşma
 * zaten varsa yenisini açmaz — sohbet geçmişi bölünmesin.
 */
export async function startConversation(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return failure('Mesaj göndermek için giriş yapmalısınız.')

  const parsed = StartSchema.safeParse({
    company_id: formData.get('company_id'),
    product_id: emptyToUndefined(formData.get('product_id')),
    rfq_id: emptyToUndefined(formData.get('rfq_id')),
    body: emptyToUndefined(formData.get('body')),
  })
  if (!parsed.success) return invalid(parsed.error)

  const { company_id, product_id, rfq_id, body } = parsed.data
  const supabase = await createClient()

  // Kendi firmanıza mesaj atmanın anlamı yok.
  const { data: own } = await supabase
    .from('companies')
    .select('id')
    .eq('id', company_id)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (own) return failure('Kendi firmanıza mesaj gönderemezsiniz.')

  let query = supabase
    .from('conversations')
    .select('id')
    .eq('buyer_id', user.id)
    .eq('company_id', company_id)
  query = product_id ? query.eq('product_id', product_id) : query.is('product_id', null)
  query = rfq_id ? query.eq('rfq_id', rfq_id) : query.is('rfq_id', null)

  const { data: existing } = await query.maybeSingle()

  let conversationId = existing?.id
  if (!conversationId) {
    const { data, error } = await supabase
      .from('conversations')
      .insert({ buyer_id: user.id, company_id, product_id, rfq_id })
      .select('id')
      .single()
    if (error) return failure(`Görüşme başlatılamadı: ${error.message}`)
    conversationId = data.id
  }

  const { error: msgError } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: user.id, body })
  if (msgError) return failure(`Mesaj gönderilemedi: ${msgError.message}`)

  revalidatePath('/', 'layout')
  redirect({
    href: { pathname: '/messages/[id]', params: { id: conversationId } },
    locale: await getLocale(),
  })
}

const ReplySchema = z.object({
  conversation_id: z.uuid(),
  body: z.string().trim().min(1).max(4000),
})

export async function sendMessage(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return failure('Bu işlem için giriş yapmalısınız.')

  const parsed = ReplySchema.safeParse({
    conversation_id: formData.get('conversation_id'),
    body: emptyToUndefined(formData.get('body')),
  })
  if (!parsed.success) return invalid(parsed.error, 'Mesaj boş olamaz.')

  const supabase = await createClient()
  // RLS yalnızca görüşmenin taraflarının yazmasına izin verir.
  const { error } = await supabase
    .from('messages')
    .insert({ ...parsed.data, sender_id: user.id })

  if (error) return failure(`Mesaj gönderilemedi: ${error.message}`)

  revalidatePath('/', 'layout')
  return { status: 'success' }
}

/** Karşı tarafın mesajlarını okundu işaretler. */
export async function markConversationRead(conversationId: string) {
  const user = await getCurrentUser()
  if (!user) return

  const supabase = await createClient()
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.id)
    .is('read_at', null)
}
