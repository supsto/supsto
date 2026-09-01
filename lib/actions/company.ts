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
