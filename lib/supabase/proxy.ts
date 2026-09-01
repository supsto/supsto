import type { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import { supabaseAnonKey, supabaseUrl } from './env'

/**
 * Supabase oturum çerezlerini tazeler ve doğrulanmış kullanıcıyı döndürür.
 *
 * `response` next-intl middleware'inden gelir ve dil rewrite başlıklarını
 * taşır; bu yüzden yeni bir response ÜRETMİYORUZ — tazelenen çerezleri
 * onun üzerine yazıyoruz. Yeni response üretmek dil yönlendirmesini silerdi.
 */
export async function refreshSession(
  request: NextRequest,
  response: NextResponse
) {
  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          // request: aynı istekteki render tazelenmiş token'ı görsün
          request.cookies.set(name, value)
          // response: tarayıcı yeni çerezi alsın
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  // getUser() token'ı Supabase'e doğrulatır; getSession() çerezdeki veriye
  // güvendiği için sunucu tarafı yetki kararlarında kullanılmaz.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}
