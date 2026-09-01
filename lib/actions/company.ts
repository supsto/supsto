'use server'

import { revalidatePath } from 'next/cache'
import { getLocale } from 'next-intl/server'
import { z } from 'zod'

import { redirect } from '@/i18n/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import type { ActionState } from '@/lib/types'
import { uniqueSlug } from '@/lib/utils'
import { emptyToUndefined, failure, invalid } from './shared'

const CompanySchema = z.object({
  name: z.string().trim().min(2, 'Firma adı girin.').max(200),
  type: z.enum(['supplier', 'buyer', 'both']),
  city: z.string().trim().max(60).optional(),
  district: z.string().trim().max(60).optional(),
  phone: z.string().trim().max(30).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  website: z.url('Geçerli bir adres girin (https://…).').optional(),
  description: z.string().trim().max(2000).optional(),
})

export async function createCompany(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return failure('Bu işlem için giriş yapmalısınız.')

  const parsed = CompanySchema.safeParse({
    name: emptyToUndefined(formData.get('name')),
    type: formData.get('type') ?? 'supplier',
    city: emptyToUndefined(formData.get('city')),
    district: emptyToUndefined(formData.get('district')),
    phone: emptyToUndefined(formData.get('phone')),
    whatsapp: emptyToUndefined(formData.get('whatsapp')),
    website: emptyToUndefined(formData.get('website')),
    description: emptyToUndefined(formData.get('description')),
  })
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('companies')
    // `verified` gönderilmiyor; gönderilse bile DB tetikleyicisi sıfırlar.
    .insert({ ...parsed.data, owner_id: user.id, slug: uniqueSlug(parsed.data.name) })
    .select('slug')
    .single()

  if (error) return failure(`Firma oluşturulamadı: ${error.message}`)

  revalidatePath('/', 'layout')
  redirect({
    href: { pathname: '/supplier/[slug]', params: { slug: data.slug } },
    locale: await getLocale(),
  })
}

const UpdateSchema = CompanySchema.extend({
  id: z.uuid(),
  address: z.string().trim().max(500).optional(),
  logo_url: z.url().optional(),
  content_language: z.enum(['tr', 'en', 'ru']),
})

/**
 * Firma bilgilerini günceller. `verified`, `verified_at`, `owner_id`
 * GÖNDERİLMEZ — gönderilse bile protect_company_columns tetikleyicisi
 * eski değerlere sıfırlar.
 */
export async function updateCompany(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return failure('Bu işlem için giriş yapmalısınız.')

  const parsed = UpdateSchema.safeParse({
    id: formData.get('id'),
    name: emptyToUndefined(formData.get('name')),
    type: formData.get('type') ?? 'supplier',
    city: emptyToUndefined(formData.get('city')),
    district: emptyToUndefined(formData.get('district')),
    address: emptyToUndefined(formData.get('address')),
    phone: emptyToUndefined(formData.get('phone')),
    whatsapp: emptyToUndefined(formData.get('whatsapp')),
    website: emptyToUndefined(formData.get('website')),
    description: emptyToUndefined(formData.get('description')),
    logo_url: emptyToUndefined(formData.get('logo_url')),
    content_language: emptyToUndefined(formData.get('content_language')) ?? 'tr',
  })
  if (!parsed.success) return invalid(parsed.error)

  const { id, ...fields } = parsed.data

  const supabase = await createClient()
  // RLS yalnızca firma sahibinin güncellemesine izin verir.
  const { error } = await supabase.from('companies').update(fields).eq('id', id)
  if (error) return failure(`Firma güncellenemedi: ${error.message}`)

  revalidatePath('/', 'layout')
  return { status: 'success', message: 'Firma bilgileri kaydedildi.' }
}
