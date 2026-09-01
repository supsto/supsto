import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'

/**
 * E-posta doğrulama / magic link dönüş noktası.
 * Supabase `?code=` ile buraya döner; kodu oturuma çeviririz.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next')

  // Açık yönlendirme engeli.
  const next =
    nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
      ? nextParam
      : '/panel'

  if (!code) {
    return NextResponse.redirect(`${origin}/giris?hata=eksik-kod`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/giris?hata=dogrulama-basarisiz`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
