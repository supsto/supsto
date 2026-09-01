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

/** Her satır bir alternatif kümesi: içinden biri tanımlıysa yeterli. */
const REQUIRED = [
  ['NEXT_PUBLIC_SUPABASE_URL'],
  ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
  /*
    getSiteUrl() ile aynı öncelik sırası. Vercel kendi alan adını
    VERCEL_PROJECT_PRODUCTION_URL olarak zaten veriyor; bunu saymazsak
    uç, çalışan bir kurulumu "bozuk" diye raporlar ve gereksiz yere
    ayar aratır.
  */
  ['NEXT_PUBLIC_SITE_URL', 'VERCEL_PROJECT_PRODUCTION_URL'],
] as const

/** Migration sırasına göre, her göçten bir temsilci tablo. */
const PROBED_TABLES = [
  'categories',            // init
  'products',              // init
  'rfqs',                  // init
  'category_translations', // 110000
  'orders',                // 120000
  'exchange_rates',        // 120000
  'group_buys',            // 130000
  'reviews',               // 150000
] as const

/** Tablo yerine kolon ekleyen göçler. */
const PROBED_COLUMNS = [
  ['profiles', 'preferred_currency'],  // 170000
  ['companies', 'company_kind'],       // 170000
  ['products', 'hs_code_digits'],      // 180000
] as const

export async function GET() {
  const isSet = (names: readonly string[]) => names.some((n) => process.env[n])
  const env = Object.fromEntries(
    REQUIRED.map((names) => [names.join(' | '), isSet(names)])
  )
  const missing = REQUIRED.filter((names) => !isSet(names)).map((names) =>
    names.join(' | ')
  )

  const checks: Record<string, { ok: boolean; detail?: string }> = {}

  // Şema kontrolü yalnızca Supabase değişkenlerine bağlıdır; SITE_URL
  // eksikse SEO bozulur ama veritabanına erişim etkilenmez.
  const canQuery =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    isSet(REQUIRED[1])

  if (canQuery) {
    const supabase = await createClient()

    /*
      Her migration'dan en az bir tabloya dokunulur; böylece "şema kaçıncı
      migration'da kalmış" sorusu tek istekle yanıtlanır. Sıra, migration
      sırasıdır: ilk hata veren tablo, eksik olanın başladığı yeri gösterir.
    */
    for (const table of PROBED_TABLES) {
      /*
        head:true KULLANMAYIN. HEAD yanıtının gövdesi olmadığı için
        istemci PostgREST'in 404 hata gövdesini okuyamıyor ve olmayan
        tabloyu "0 satır" diye başarılı sayıyordu — teşhis ucunun tam da
        güvenilmesi gereken durumda yalan söylemesi demekti.
      */
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(0)
      checks[table] = error
        ? { ok: false, detail: `${error.code ?? '?'} ${error.message}` }
        : { ok: true, detail: `${count ?? 0} satır` }
    }

    /*
      Tablo var ama kolon yoksa yukarıdaki sayım yine de geçer. Sonradan
      eklenen kolonları ayrıca seçerek bunu yakalıyoruz.
    */
    for (const [table, column] of PROBED_COLUMNS) {
      const { error } = await supabase.from(table).select(column).limit(1)
      checks[`${table}.${column}`] = error
        ? { ok: false, detail: `${error.code ?? '?'} ${error.message}` }
        : { ok: true }
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
