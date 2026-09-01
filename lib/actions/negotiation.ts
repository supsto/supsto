'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import type { ActionState } from '@/lib/types'
import { emptyToUndefined, failure, invalid } from './shared'

const Schema = z.object({
  quote_id: z.uuid(),
  side: z.enum(['supplier', 'buyer']),
  price: z.coerce.number().positive('Fiyat pozitif olmalı.'),
  moq: z.coerce.number().int().positive().optional(),
  delivery_days: z.coerce.number().int().positive().max(365).optional(),
  message: z.string().trim().max(1000).optional(),
})

/**
 * Bir pazarlık turu ekler.
 *
 * B2B'de teklif tek atışlık değildir. Her tur `quote_revisions`'a
 * yazılır; `quotes` tablosu YÜRÜRLÜKTEKİ teklifi tutar. Tedarikçi tur
 * eklerse yürürlükteki fiyat da güncellenir — alıcının karşı teklifi
 * ise yalnızca öneridir, tedarikçi kabul edene kadar fiyatı değiştirmez.
 */
export async function addQuoteRevision(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return failure('Bu işlem için giriş yapmalısınız.')

  const parsed = Schema.safeParse({
    quote_id: formData.get('quote_id'),
    side: formData.get('side'),
    price: emptyToUndefined(formData.get('price')),
    moq: emptyToUndefined(formData.get('moq')),
    delivery_days: emptyToUndefined(formData.get('delivery_days')),
    message: emptyToUndefined(formData.get('message')),
  })
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const { data: quote } = await supabase
    .from('quotes')
    .select('id, status, currency, revision_count')
    .eq('id', parsed.data.quote_id)
    .maybeSingle()

  if (!quote) return failure('Teklif bulunamadı.')
  if (quote.status !== 'pending') {
    return failure('Karar verilmiş bir teklifte pazarlık yapılamaz.')
  }

  // RLS: yalnızca ilgili taraf kendi tarafı adına tur ekleyebilir.
  const { error } = await supabase.from('quote_revisions').insert({
    ...parsed.data,
    actor_id: user.id,
    currency: quote.currency,
  })
  if (error) return failure(error.message)

  if (parsed.data.side === 'supplier') {
    // Tedarikçinin son sözü yürürlükteki tekliftir.
    await supabase
      .from('quotes')
      .update({
        price: parsed.data.price,
        moq: parsed.data.moq,
        delivery_days: parsed.data.delivery_days,
        revision_count: quote.revision_count + 1,
      })
      .eq('id', quote.id)
  } else {
    await supabase
      .from('quotes')
      .update({ revision_count: quote.revision_count + 1 })
      .eq('id', quote.id)
  }

  revalidatePath('/', 'layout')
  return { status: 'success' }
}
