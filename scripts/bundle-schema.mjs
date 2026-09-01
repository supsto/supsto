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
const OUT = 'supabase/full-schema.sql'

const header = `-- ============================================================
-- SUPSTO — birleşik şema
--
-- ÜRETİLMİŞ DOSYA. Elle düzenlemeyin. Üretmek için: npm run db:bundle
-- supabase/migrations/ altındaki tüm göçler sırasıyla birleştirildi.
--
-- KULLANIM: Supabase Dashboard > SQL Editor > yapıştır > Run
--
-- Bu dosya BOŞ bir proje içindir. init göçü \`create table\` (
-- \`if not exists\` değil) kullandığı için, tabloların bir kısmı zaten
-- varsa ilk ifadede durur.
--
-- Tabloların bir kısmı zaten varsa iki seçenek:
--   1) Proje BOŞSA (0 satır): aşağıdaki iki satırı yorumdan çıkarın.
--      Şemayı sıfırlar; auth kullanıcıları ETKİLENMEZ (ayrı şemadadır).
--   2) Veri VARSA: bu dosyayı kullanmayın, \`npx supabase db push\`
--      ile yalnızca eksik göçleri uygulayın.
-- ============================================================

-- drop schema public cascade;
-- create schema public;
`
const files = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort()
const body = files
  .map((f) => `\n\n-- ============ ${f} ============\n${readFileSync(join(DIR, f), 'utf8')}`)
  .join('')

writeFileSync(OUT, header + body)
console.log(`${files.length} göç → ${OUT}`)
