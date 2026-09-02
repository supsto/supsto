/**
 * supabase/migrations/ içindekileri tek dosyada birleştirir.
 *
 * Boş bir üretim projesine şemayı SQL Editor'den tek seferde uygulamak
 * için gerekir; `db push` yalnızca CLI'ı veritabanına bağlayabilenlerin
 * kullanabildiği bir yol.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = 'supabase/migrations'

/*
  --since <damga>  yalnizca o damgadan SONRAKI gocleri toplar.
  Sema zaten kismen uygulanmis bir veritabanina, tam paketi (ve onun
  sifirlama basligini) calistirmadan eksikleri tasimak icin.
*/
const args = process.argv.slice(2)
const sinceIndex = args.indexOf('--since')
const since = sinceIndex >= 0 ? args[sinceIndex + 1] : null
const outIndex = args.indexOf('--out')
const OUT = outIndex >= 0 ? args[outIndex + 1] : 'supabase/full-schema.sql'

/*
  Şemayı sıfırlamadan önce veri OLMADIĞINI kanıtlar.

  Dosyanın başındaki uyarı yazısına güvenmek yetmez; yanlış veritabanında
  çalıştırılması geri dönüşü olmayan bir kayıp demektir. Bu blok her
  tabloyu sayar ve tek satır bile bulursa işlemi durdurur — SQL Editor
  her şeyi tek işlemde çalıştırdığı için sonraki hiçbir ifade işlemez.
*/
const guard = `-- ---------- GÜVENLİK KİLİDİ ----------
do $guard$
declare
  total bigint;
begin
  select coalesce(sum(n), 0) into total
  from (
    select (xpath(
      '/row/c/text()',
      query_to_xml(format('select count(*) as c from public.%I', tablename),
                   false, true, '')
    ))[1]::text::bigint as n
    from pg_tables where schemaname = 'public'
  ) t;

  if total > 0 then
    raise exception
      'public şemasinda % satir var; bu dosya yalnizca BOS veritabani icindir. Eksik gocleri uygulamak icin: npx supabase db push',
      total;
  end if;
end
$guard$;

-- ---------- ŞEMAYI SIFIRLA ----------
-- init göçü \`create table\` kullanıyor (\`if not exists\` değil), bu yüzden
-- tabloların bir kısmı zaten varsa dosya çakışır. Yukarıdaki kilit veri
-- olmadığını doğruladı. auth.users AYRI şemadadır, etkilenmez.
drop schema if exists public cascade;
create schema public;
alter schema public owner to pg_database_owner;

-- Supabase'in varsayılan yetkileri şemayla birlikte silinir. Geri
-- verilmezse kurulum başarılı görünür ama \`anon\` hiçbir tabloyu okuyamaz
-- ve site sessizce boş döner. Tabloları RLS korur, bu yetkiler değil.
grant usage on schema public to public, anon, authenticated, service_role;
grant create on schema public to postgres, service_role;
alter default privileges in schema public
  grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to postgres, anon, authenticated, service_role;
`

/*
  Göçler çalıştıktan sonra da açıkça yetki verilir: `alter default
  privileges` yalnızca SONRADAN yaratılan nesneleri kapsar ve tek bir
  sıralama hatası tüm siteyi boş bırakır. İki kez vermek zararsızdır.
*/
const footer = `

-- ============ kurulum sonrası yetkiler ============
grant all on all tables in schema public
  to postgres, anon, authenticated, service_role;
grant all on all functions in schema public
  to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public
  to postgres, anon, authenticated, service_role;
`

const header = `-- ============================================================
-- SUPSTO — birleşik şema (BOŞ veritabanı kurulumu)
--
-- ÜRETİLMİŞ DOSYA. Elle düzenlemeyin. Üretmek için: npm run db:bundle
--
-- KULLANIM: Supabase Dashboard > SQL Editor > yapıştır > Run.
-- Hiçbir düzenleme gerekmez.
--
-- Bu dosya public şemasını silip baştan kurar. Baştaki güvenlik kilidi
-- herhangi bir tabloda tek satır bile bulursa işlemi durdurur; yani dolu
-- bir veritabanında çalışmaz.
--
-- Veri VARSA bu dosyayı kullanmayın: \`npx supabase db push\` yalnızca
-- eksik göçleri uygular.
-- ============================================================

`

const files = readdirSync(DIR)
  .filter((f) => f.endsWith('.sql'))
  .filter((f) => !since || f.slice(0, 14) > since)
  .sort()
const body = files
  .map(
    (f) =>
      `\n\n-- ============ ${f} ============\n${readFileSync(join(DIR, f), 'utf8')}`
  )
  .join('')

/*
  Eksik gocler paketinde sifirlama YOK: hedef veritabaninda zaten veri
  var. Gocler kendi iclerinde idempotent yazildigi icin (add column if
  not exists, drop policy if exists, on conflict) tekrar calistirmak
  guvenli.
*/
const partialHeader = `-- ============================================================
-- SUPSTO — eksik gocler (${since} sonrasi)
--
-- URETILMIS DOSYA. Uretmek icin:
--   npm run db:pending
--
-- KULLANIM: Supabase Dashboard > SQL Editor > yapistir > Run.
-- Semayi SIFIRLAMAZ; yalnizca eksik gocleri uygular. Zaten uygulanmis
-- bir gocu tekrar calistirmak guvenlidir.
-- ============================================================
`

writeFileSync(OUT, (since ? partialHeader : header + guard) + body + (since ? '' : footer))
console.log(`${files.length} göç → ${OUT}`)
