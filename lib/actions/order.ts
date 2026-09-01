'use server'

import { revalidatePath } from 'next/cache'
import { getLocale } from 'next-intl/server'
import { z } from 'zod'

import { redirect } from '@/i18n/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import type { ActionState } from '@/lib/types'
import { failure, invalid } from './shared'

/**
 * Kabul edilmiş bir teklifden sipariş açar. Ticari şartlar teklifden
 * kopyalanır — kullanıcı girdisinden değil; aksi halde taraflardan biri
 * anlaşılandan farklı bir fiyatla sipariş açabilirdi.
 */
export async function createOrderFromQuote(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return failure('Bu işlem için giriş yapmalısınız.')

  const quoteId = formData.get('quote_id')
  if (typeof quoteId !== 'string') return failure('Geçersiz istek.')

  const supabase = await createClient()
  const { data: quote } = await supabase
    .from('quotes')
    .select('*, rfq:rfqs ( id, buyer_id, title, quantity, unit )')
    .eq('id', quoteId)
    .maybeSingle()

  if (!quote) return failure('Teklif bulunamadı.')
  if (quote.status !== 'accepted') return failure('Yalnızca kabul edilmiş tekliften sipariş açılır.')

  const rfq = quote.rfq as { id: string; buyer_id: string; title: string; quantity: number | null; unit: string | null } | null
  if (!rfq || rfq.buyer_id !== user.id) return failure('Bu teklif size ait değil.')

  const { data, error } = await supabase
    .from('orders')
    .insert({
      buyer_id: user.id,
      company_id: quote.company_id,
      quote_id: quote.id,
      rfq_id: rfq.id,
      title: rfq.title,
      quantity: rfq.quantity ?? quote.moq ?? 1,
      unit: rfq.unit,
      unit_price: quote.price,
      currency: quote.currency,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return failure('Bu teklif için zaten bir sipariş var.')
    return failure(`Sipariş oluşturulamadı: ${error.message}`)
  }

  revalidatePath('/', 'layout')
  redirect({
    href: { pathname: '/orders/[id]', params: { id: data.id } },
    locale: await getLocale(),
  })
}

const AdvanceSchema = z.object({
  order_id: z.uuid(),
  status: z.enum([
    'confirmed', 'in_production', 'shipped', 'delivered', 'completed', 'cancelled',
  ]),
})

/**
 * Durumu bir adım ilerletir. Hangi tarafın hangi geçişi yapabileceğini
 * veritabanındaki enforce_order_transition tetikleyicisi zorlar; burada
 * yalnızca kullanıcıya okunur hata döndürürüz.
 */
export async function advanceOrder(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return failure('Bu işlem için giriş yapmalısınız.')

  const parsed = AdvanceSchema.safeParse({
    order_id: formData.get('order_id'),
    status: formData.get('status'),
  })
  if (!parsed.success) return invalid(parsed.error, 'Geçersiz istek.')

  const supabase = await createClient()
  const { error } = await supabase
    .from('orders')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.order_id)

  if (error) return failure(error.message)

  revalidatePath('/', 'layout')
  return { status: 'success' }
}
