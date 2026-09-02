'use server'

import { revalidatePath } from 'next/cache'
import { getLocale } from 'next-intl/server'
import { z } from 'zod'

import { redirect } from '@/i18n/navigation'
import { getCurrentUser, getMyCompanies } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import type { ActionState } from '@/lib/types'
import { emptyToUndefined, failure, invalid } from './shared'

const QuoteSchema = z.object({
  rfq_id: z.uuid(),
  company_id: z.uuid('Teklif vereceğiniz firmayı seçin.'),
  price: z.coerce.number().positive('Birim fiyat pozitif olmalı.'),
  moq: z.coerce.number().int().positive().optional(),
  delivery_days: z.coerce.number().int().positive().max(365).optional(),
  valid_until: z.iso.date().optional(),
  message: z.string().trim().max(2000).optional(),
})

export async function submitQuote(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return failure('Bu işlem için giriş yapmalısınız.')

  const parsed = QuoteSchema.safeParse({
    rfq_id: formData.get('rfq_id'),
    company_id: formData.get('company_id'),
    price: emptyToUndefined(formData.get('price')),
    moq: emptyToUndefined(formData.get('moq')),
    delivery_days: emptyToUndefined(formData.get('delivery_days')),
    valid_until: emptyToUndefined(formData.get('valid_until')),
    message: emptyToUndefined(formData.get('message')),
  })

  if (!parsed.success) return invalid(parsed.error)

  // Kullanıcı gerçekten bu firmanın sahibi mi? RLS de bunu zorlar, ama
  // buradaki kontrol kullanıcıya anlamlı bir hata mesajı verir.
  const companies = await getMyCompanies()
  if (!companies.some((c) => c.id === parsed.data.company_id)) {
    return failure('Bu firma adına teklif verme yetkiniz yok.')
  }

  const supabase = await createClient()
  const { error } = await supabase.from('quotes').insert(parsed.data)

  if (error) {
    // quotes_rfq_company_uniq: aynı firma bir RFQ'ya tek teklif verir.
    if (error.code === '23505') {
      return failure('Bu RFQ’ya zaten teklif verdiniz. Mevcut teklifinizi güncelleyebilirsiniz.')
    }
    return failure(`Teklif gönderilemedi: ${error.message}`)
  }

  revalidatePath('/', 'layout')
  redirect({
    href: { pathname: '/rfq/[id]', params: { id: parsed.data.rfq_id } },
    locale: await getLocale(),
  })
}

const DecisionSchema = z.object({
  quote_id: z.uuid(),
  rfq_id: z.uuid(),
  status: z.enum(['accepted', 'rejected']),
})

/**
 * RFQ sahibi teklifi kabul/ret eder. Fiyat ve şartlara dokunamaz —
 * bunu veritabanındaki protect_quote_columns tetikleyicisi garanti eder.
 */
export async function decideQuote(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return failure('Bu işlem için giriş yapmalısınız.')

  const parsed = DecisionSchema.safeParse({
    quote_id: formData.get('quote_id'),
    rfq_id: formData.get('rfq_id'),
    status: formData.get('status'),
  })

  if (!parsed.success) return invalid(parsed.error, 'Geçersiz istek.')

  const supabase = await createClient()
  /*
    Kabul, şartların donduğu andır: agreed_at yazıldıktan sonra
    veritabanı tetiği fiyat/termin/ödeme şartlarının değişmesini
    engelliyor. Alıcının kabul ettiği anlaşma, siparişe birebir geçmeli.
  */
  const { error } = await supabase
    .from('quotes')
    .update({
      status: parsed.data.status,
      agreed_at:
        parsed.data.status === 'accepted' ? new Date().toISOString() : null,
    })
    .eq('id', parsed.data.quote_id)

  if (error) return failure(`Teklif güncellenemedi: ${error.message}`)

  revalidatePath('/', 'layout')
  return {
    status: 'success',
    message:
      parsed.data.status === 'accepted' ? 'Teklif kabul edildi.' : 'Teklif reddedildi.',
  }
}
