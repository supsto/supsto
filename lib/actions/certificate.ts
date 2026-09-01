'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getMyCompanies } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import type { ActionState } from '@/lib/types'
import { emptyToUndefined, failure, invalid } from './shared'

const KINDS = ['iso', 'ce', 'tse', 'halal', 'organic', 'gmp', 'fsc', 'reach', 'other'] as const

const Schema = z.object({
  company_id: z.uuid(),
  kind: z.enum(KINDS),
  name: z.string().trim().min(2, 'Sertifika adı girin.').max(150),
  issuer: z.string().trim().max(150).optional(),
  number: z.string().trim().max(80).optional(),
  issued_at: z.iso.date().optional(),
  expires_at: z.iso.date().optional(),
})

/**
 * Sertifika ekler. `verified` GÖNDERİLMEZ — gönderilse bile veritabanı
 * tetikleyicisi sıfırlar; doğrulamayı yalnızca admin verir.
 */
export async function addCertificate(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = Schema.safeParse({
    company_id: formData.get('company_id'),
    kind: emptyToUndefined(formData.get('kind')) ?? 'other',
    name: emptyToUndefined(formData.get('name')),
    issuer: emptyToUndefined(formData.get('issuer')),
    number: emptyToUndefined(formData.get('number')),
    issued_at: emptyToUndefined(formData.get('issued_at')),
    expires_at: emptyToUndefined(formData.get('expires_at')),
  })
  if (!parsed.success) return invalid(parsed.error)

  const companies = await getMyCompanies()
  if (!companies.some((c) => c.id === parsed.data.company_id)) {
    return failure('Bu firma adına sertifika ekleyemezsiniz.')
  }

  const supabase = await createClient()
  const { error } = await supabase.from('company_certificates').insert(parsed.data)
  if (error) return failure(error.message)

  revalidatePath('/', 'layout')
  return { status: 'success', message: 'Sertifika eklendi. Doğrulama için incelenecek.' }
}

export async function deleteCertificate(formData: FormData): Promise<void> {
  const id = formData.get('id')
  if (typeof id !== 'string') return
  const supabase = await createClient()
  await supabase.from('company_certificates').delete().eq('id', id)
  revalidatePath('/', 'layout')
}
