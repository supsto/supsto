'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { CURRENCIES, CURRENCY_COOKIE, type CurrencyCode } from '@/lib/currency'

/**
 * Para birimi tercihi.
 *
 * Anonim ziyaretçi için çerez, giriş yapmış kullanıcı için profil.
 * İkisi birden yazılır: kullanıcı çıkış yapsa da tercihi kaybolmaz.
 */
export async function setCurrency(formData: FormData) {
  const value = formData.get('currency')
  if (typeof value !== 'string' || !CURRENCIES.includes(value as CurrencyCode)) return

  const store = await cookies()
  store.set(CURRENCY_COOKIE, value, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    path: '/',
  })

  const user = await getCurrentUser()
  if (user) {
    const supabase = await createClient()
    await supabase.from('profiles').update({ preferred_currency: value }).eq('id', user.id)
  }

  revalidatePath('/', 'layout')
}
