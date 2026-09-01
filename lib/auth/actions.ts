'use server'

import { redirect as localeRedirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getLocale } from 'next-intl/server'
import { z } from 'zod'

import { redirect } from '@/i18n/navigation'
import { getSiteUrl } from '@/lib/site-url'

import { createClient } from '@/lib/supabase/server'
import { failure, invalid, emptyToUndefined } from '@/lib/actions/shared'
import type { ActionState } from '@/lib/types'

/**
 * `?next=` parametresi proxy.ts tarafından ZATEN çevrilmiş ve dil önekli
 * hâlde yazılır (ör. `/tr/panel`), bu yüzden tekrar çevirmeden düz
 * yönlendirme kullanılır. Açık yönlendirme (open redirect) engeli:
 * yalnızca site içi göreli yollar kabul edilir.
 */
function safeNext(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (!value.startsWith('/') || value.startsWith('//')) return null
  return value
}



/* ------------------------------------------------------------------ */
/* E-posta + şifre                                                     */
/* ------------------------------------------------------------------ */

const LoginSchema = z.object({
  email: z.email('Geçerli bir e-posta girin.'),
  password: z.string().min(1, 'Şifrenizi girin.'),
})

export async function signInWithPassword(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    // Hangi e-postanın kayıtlı olduğunu sızdırmamak için tek mesaj.
    return failure('E-posta veya şifre hatalı.')
  }

  revalidatePath('/', 'layout')

  const next = safeNext(formData.get('next'))
  if (next) localeRedirect(next)
  redirect({ href: '/dashboard', locale: await getLocale() })
}

/*
  Kayıt bilerek kısa tutuldu: hesap tipi, ad, e-posta, şifre.
  Telefon ve firma bilgileri profil sayfasına taşındı. "Şifre tekrar"
  alanı yok — form göster/gizle düğmesi sunuyor, iki kez yazdırmak
  gereksiz sürtünme.
*/
const RegisterSchema = z.object({
  full_name: z.string().trim().min(2, 'Ad soyad girin.').max(120),
  email: z.email('Geçerli bir e-posta girin.'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalı.').max(72),
  role: z.enum(['buyer', 'supplier', 'both']),
})

export async function signUpWithPassword(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = RegisterSchema.safeParse({
    full_name: emptyToUndefined(formData.get('full_name')),
    email: emptyToUndefined(formData.get('email')),
    password: formData.get('password'),
    role: formData.get('role') ?? 'buyer',
  })
  if (!parsed.success) return invalid(parsed.error)

  const { email, password, full_name, role } = parsed.data
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // handle_new_user tetikleyicisi bu metadata'dan profili doldurur.
      data: { full_name, role },
      emailRedirectTo: `${await getSiteUrl()}/auth/callback`,
    },
  })

  if (error) return failure(error.message)

  const locale = await getLocale()

  // E-posta doğrulaması açıksa oturum gelmez; kullanıcıyı bilgilendir.
  if (!data.session) {
    redirect({ href: { pathname: '/verify', query: { email } }, locale })
  }

  revalidatePath('/', 'layout')
  // Tüm doğrulama ve tamamlama adımları profil sayfasında toplanır.
  redirect({ href: '/profile', locale })
}

export async function signOut() {
  const supabase = await createClient()
  const locale = await getLocale()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect({ href: '/', locale })
}

/* ------------------------------------------------------------------ */
/* Telefon + OTP                                                       */
/* Altyapı hazır; supabase/config.toml içinde [auth.sms] etkinleştirilip  */
/* bir SMS sağlayıcı (Twilio vb.) tanımlanınca çalışır.                  */
/* ------------------------------------------------------------------ */

const PhoneSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+[1-9][0-9]{9,14}$/, 'Telefonu +905XXXXXXXXX biçiminde girin.'),
})

export async function sendPhoneOtp(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = PhoneSchema.safeParse({ phone: formData.get('phone') })
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({ phone: parsed.data.phone })

  if (error) return failure(error.message)
  return { status: 'success', message: 'Doğrulama kodu gönderildi.' }
}

const VerifyOtpSchema = z.object({
  phone: z.string().trim().min(10),
  token: z.string().trim().regex(/^[0-9]{6}$/, '6 haneli kodu girin.'),
})

export async function verifyPhoneOtp(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = VerifyOtpSchema.safeParse({
    phone: formData.get('phone'),
    token: formData.get('token'),
  })
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ ...parsed.data, type: 'sms' })

  if (error) return failure('Kod geçersiz veya süresi dolmuş.')

  revalidatePath('/', 'layout')
  const next = safeNext(formData.get('next'))
  if (next) localeRedirect(next)
  redirect({ href: '/dashboard', locale: await getLocale() })
}
