import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

/**
 * Yapılandırma teşhisi. Sır sızdırmaz — yalnızca "tanımlı mı" bilgisi ve
 * şemanın uygulanıp uygulanmadığı. Dağıtım sonrası "neden boş / neden 500"
 * sorusunu tek istekte yanıtlar.
 *
 * robots.txt içinde /api/ zaten taramaya kapalı.
 */
export const dynamic = 'force-dynamic'

const REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SITE_URL',
] as const

export async function GET() {
  const env = Object.fromEntries(
    REQUIRED.map((name) => [name, Boolean(process.env[name])])
  )
  const missing = REQUIRED.filter((name) => !process.env[name])

  const checks: Record<string, { ok: boolean; detail?: string }> = {}

  // Şema kontrolü yalnızca Supabase değişkenlerine bağlıdır; SITE_URL
  // eksikse SEO bozulur ama veritabanına erişim etkilenmez.
  const canQuery =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  if (canQuery) {
    const supabase = await createClient()

    // Şemanın uygulanıp uygulanmadığını anlatan en kritik iki tablo.
    for (const table of ['categories', 'category_translations', 'products'] as const) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      checks[table] = error
        ? { ok: false, detail: `${error.code ?? '?'} ${error.message}` }
        : { ok: true, detail: `${count ?? 0} satır` }
    }
  }

  const schemaOk = canQuery && Object.values(checks).every((c) => c.ok)
  const healthy = missing.length === 0 && schemaOk

  return NextResponse.json(
    {
      healthy,
      env,
      missingEnv: missing,
      schema: checks,
      hint: !healthy
        ? missing.length
          ? 'Vercel > Project Settings > Environment Variables eksik.'
          : 'Şema uygulanmamış olabilir: `npx supabase db push` (bkz. DEPLOYMENT.md).'
        : undefined,
    },
    { status: healthy ? 200 : 503 }
  )
}
