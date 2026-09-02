'use server'

import { revalidatePath } from 'next/cache'
import { getLocale } from 'next-intl/server'
import { z } from 'zod'

import { redirect } from '@/i18n/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import type { ActionState } from '@/lib/types'
import { emptyToUndefined, failure, invalid } from './shared'

const RfqSchema = z.object({
  title: z
    .string()
    .trim()
    .min(10, 'Başlık en az 10 karakter olmalı.')
    .max(160, 'Başlık en fazla 160 karakter olabilir.'),
  description: z
    .string()
    .trim()
    .min(20, 'Açıklama en az 20 karakter olmalı — tedarikçilerin doğru teklif verebilmesi için detay şart.')
    .max(4000),
  category_id: z.uuid('Kategori seçin.').optional(),
  quantity: z.coerce.number().int().positive('Miktar pozitif bir sayı olmalı.').optional(),
  unit: z.string().trim().max(20).optional(),
  target_price: z.coerce.number().positive('Hedef fiyat pozitif olmalı.').optional(),
  country_code: z.string().trim().length(2).toUpperCase().optional(),
  province_id: z.uuid().optional(),
  city: z.string().trim().max(60).optional(),
  delivery_days: z.coerce.number().int().positive().max(365).optional(),
  deadline: z.iso.date('Geçerli bir tarih girin.').optional(),
})

export async function createRfq(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  // Server Action'lar doğrudan POST ile de çağrılabilir; yetkiyi burada doğrula.
  const user = await getCurrentUser()
  if (!user) return failure('Bu işlem için giriş yapmalısınız.')

  const parsed = RfqSchema.safeParse({
    title: emptyToUndefined(formData.get('title')),
    description: emptyToUndefined(formData.get('description')),
    category_id: emptyToUndefined(formData.get('category_id')),
    quantity: emptyToUndefined(formData.get('quantity')),
    unit: emptyToUndefined(formData.get('unit')),
    target_price: emptyToUndefined(formData.get('target_price')),
    country_code: emptyToUndefined(formData.get('country_code')),
    province_id: emptyToUndefined(formData.get('province_id')),
    city: emptyToUndefined(formData.get('city')),
    delivery_days: emptyToUndefined(formData.get('delivery_days')),
    deadline: emptyToUndefined(formData.get('deadline')),
  })

  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('rfqs')
    // buyer_id'yi istemciden almıyoruz; RLS de zaten auth.uid() ile eşleşmesini şart koşuyor.
    .insert({ ...parsed.data, buyer_id: user.id, status: 'open' })
    .select('id')
    .single()

  if (error) return failure(`RFQ oluşturulamadı: ${error.message}`)

  revalidatePath('/', 'layout')
  // Server Action'lar next/root-params kullanamaz; dili next-intl'den alıp
  // çevrilmiş yolu (ör. /ru/zapros/<id>) kendimiz üretiyoruz.
  redirect({
    href: { pathname: '/rfq/[id]', params: { id: data.id } },
    locale: await getLocale(),
  })
}

export async function closeRfq(rfqId: string): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return failure('Bu işlem için giriş yapmalısınız.')

  const supabase = await createClient()
  // RLS yalnızca RFQ sahibinin güncellemesine izin verir.
  const { error } = await supabase
    .from('rfqs')
    .update({ status: 'closed' })
    .eq('id', rfqId)

  if (error) return failure(`RFQ kapatılamadı: ${error.message}`)

  revalidatePath('/', 'layout')
  return { status: 'success', message: 'RFQ kapatıldı.' }
}
