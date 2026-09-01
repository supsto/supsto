'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth/session'
import { getSiteUrl } from '@/lib/site-url'
import { createClient } from '@/lib/supabase/server'
import type { ActionState } from '@/lib/types'
import { emptyToUndefined, failure, invalid } from './shared'

const ProfileSchema = z.object({
  full_name: z.string().trim().min(2, 'Ad soyad girin.').max(120),
  job_title: z.string().trim().max(80).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{10,20}$/, 'Geçerli bir telefon girin.')
    .optional(),
  role: z.enum(['buyer', 'supplier', 'both']),
  preferred_panel: z.enum(['buyer', 'supplier']).optional(),
})

/**
 * Profil bilgilerini günceller.
 *
 * `phone_verified` GÖNDERİLMEZ — tetikleyici zaten korur ve telefon
 * değişirse doğrulamayı düşürür. `role` serbestçe değiştirilebilir
 * (perakendeci sonradan toptancı olabilir) ama 'admin' seçilemez.
 */
export async function updateProfile(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return failure('Bu işlem için giriş yapmalısınız.')

  const parsed = ProfileSchema.safeParse({
    full_name: emptyToUndefined(formData.get('full_name')),
    job_title: emptyToUndefined(formData.get('job_title')),
    phone: emptyToUndefined(formData.get('phone')),
    role: formData.get('role') ?? 'buyer',
    preferred_panel: emptyToUndefined(formData.get('preferred_panel')),
  })
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase.from('profiles').update(parsed.data).eq('id', user.id)
  if (error) return failure(`Profil güncellenemedi: ${error.message}`)

  revalidatePath('/', 'layout')
  return { status: 'success', message: 'Profil güncellendi.' }
}

const PasswordSchema = z.object({
  password: z.string().min(8, 'Şifre en az 8 karakter olmalı.').max(72),
})

export async function changePassword(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = PasswordSchema.safeParse({ password: formData.get('password') })
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return failure(error.message)

  return { status: 'success', message: 'Şifreniz güncellendi.' }
}

/** E-posta doğrulama bağlantısını yeniden gönderir. */
export async function resendVerificationEmail(): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user?.email) return failure('E-posta adresi bulunamadı.')

  const supabase = await createClient()
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: user.email,
    options: {
      emailRedirectTo: `${await getSiteUrl()}/auth/callback`,
    },
  })
  if (error) return failure(error.message)

  return { status: 'success', message: 'Doğrulama e-postası gönderildi.' }
}

/* ------------------------------------------------------------------ */
/* Firma doğrulama talebi                                              */
/* ------------------------------------------------------------------ */

const VerificationSchema = z.object({
  company_id: z.uuid(),
  note: z.string().trim().max(1000).optional(),
})

/**
 * Saha doğrulaması talebi açar.
 *
 * `status` GÖNDERİLMEZ; tetikleyici her hâlükârda 'pending' yazar.
 * Kısmi tekil indeks aynı firmaya ikinci bekleyen talebi engeller.
 */
export async function requestVerification(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return failure('Bu işlem için giriş yapmalısınız.')

  const parsed = VerificationSchema.safeParse({
    company_id: formData.get('company_id'),
    note: emptyToUndefined(formData.get('note')),
  })
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase
    .from('company_verifications')
    .insert({ ...parsed.data, requested_by: user.id })

  if (error) {
    if (error.code === '23505') return failure('Zaten bekleyen bir talebiniz var.')
    return failure(error.message)
  }

  revalidatePath('/', 'layout')
  return { status: 'success', message: 'Doğrulama talebiniz alındı.' }
}
