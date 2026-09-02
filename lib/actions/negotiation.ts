'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import type { ActionState } from '@/lib/types'
import { emptyToUndefined, failure, invalid } from './shared'

const INCOTERMS = [
  'EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP',
] as const

const Schema = z.object({
  quote_id: z.uuid(),
  side: z.enum(['supplier', 'buyer']),
  price: z.coerce.number().positive('Fiyat pozitif olmalı.'),
  moq: z.coerce.number().int().positive().optional(),
  delivery_days: z.coerce.number().int().positive().max(365).optional(),
  incoterm: z.enum(INCOTERMS).optional(),
  advance_pct: z.coerce
    .number()
    .int()
    .min(0)
    .max(100, 'Peşinat oranı 0-100 arasında olmalı.')
    .optional(),
  payment_days: z.coerce
    .number()
    .int()
    .min(0)
    .max(365, 'Vade en fazla 365 gün olabilir.')
    .optional(),
  defect_tolerance_pct: z.coerce
    .number()
    .min(0)
    .max(100, 'Defo toleransı 0-100 arasında olmalı.')
    .optional(),
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
    incoterm: emptyToUndefined(formData.get('incoterm')),
    advance_pct: emptyToUndefined(formData.get('advance_pct')),
    payment_days: emptyToUndefined(formData.get('payment_days')),
    defect_tolerance_pct: emptyToUndefined(formData.get('defect_tolerance_pct')),
    message: emptyToUndefined(formData.get('message')),
  })
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const { data: quote } = await supabase
    .from('quotes')
    .select('id, status, currency, revision_count, agreed_at')
    .eq('id', parsed.data.quote_id)
    .maybeSingle()

  if (!quote) return failure('Teklif bulunamadı.')
  if (quote.status !== 'pending') {
    return failure('Karar verilmiş bir teklifte pazarlık yapılamaz.')
  }
  if (quote.agreed_at) {
    return failure('Anlaşmaya varılmış teklifte pazarlık turu açılamaz.')
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
    /*
      Yalnızca bu turda GİRİLEN alanlar yürürlüğe geçer. Boş bırakılan
      bir alanı null'a çekmek, önceki turda anlaşılmış şartı sessizce
      geri alırdı.
    */
    /*
      Yalnızca bu turda GİRİLEN alanlar yürürlüğe geçer. Boş bırakılan
      bir alanı null'a çekmek, önceki turda anlaşılmış şartı sessizce
      geri alırdı.
    */
    const NON_TERM_FIELDS = new Set(['quote_id', 'side', 'message'])
    const patch = {
      ...Object.fromEntries(
        Object.entries(parsed.data).filter(
          ([key, value]) => !NON_TERM_FIELDS.has(key) && value !== undefined
        )
      ),
      revision_count: quote.revision_count + 1,
    }

    await supabase.from('quotes').update(patch).eq('id', quote.id)
  } else {
    await supabase
      .from('quotes')
      .update({ revision_count: quote.revision_count + 1 })
      .eq('id', quote.id)
  }

  revalidatePath('/', 'layout')
  return { status: 'success' }
}
