'use server'

import { revalidatePath } from 'next/cache'

import { getCurrentUser, isAdmin } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import type { ActionState } from '@/lib/types'
import { failure } from './shared'

/**
 * Saha doğrulama rozetini verir/kaldırır.
 *
 * Yetkiyi veritabanındaki protect_company_columns tetikleyicisi zorlar —
 * admin olmayan biri bu action'ı doğrudan POST etse bile `verified`
 * değeri eski hâline sıfırlanır. Buradaki kontrol kullanıcıya anlamlı
 * hata döndürmek içindir.
 */
export async function setCompanyVerified(formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return failure('Giriş yapmalısınız.')
  if (!(await isAdmin())) return failure('Bu işlem için yönetici olmalısınız.')

  const companyId = formData.get('company_id')
  const verified = formData.get('verified') === 'true'
  if (typeof companyId !== 'string') return failure('Geçersiz istek.')

  const supabase = await createClient()
  const { error } = await supabase
    .from('companies')
    .update({
      verified,
      verified_at: verified ? new Date().toISOString() : null,
      verified_by: verified ? user.id : null,
    })
    .eq('id', companyId)

  if (error) return failure(error.message)

  revalidatePath('/', 'layout')
  return { status: 'success' }
}

export async function setCertificateVerified(formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return failure('Bu işlem için yönetici olmalısınız.')

  const id = formData.get('certificate_id')
  const verified = formData.get('verified') === 'true'
  if (typeof id !== 'string') return failure('Geçersiz istek.')

  const supabase = await createClient()
  const { error } = await supabase
    .from('company_certificates')
    .update({ verified, verified_at: verified ? new Date().toISOString() : null })
    .eq('id', id)

  if (error) return failure(error.message)

  revalidatePath('/', 'layout')
  return { status: 'success' }
}
