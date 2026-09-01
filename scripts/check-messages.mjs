#!/usr/bin/env node
/**
 * Çeviri anahtarı denetimi.
 *
 * next-intl eksik anahtarı ÇALIŞMA ANINDA bildirir; yani hata ancak o
 * sayfa açıldığında görülür ve kolayca gözden kaçar. Bu betik kaynak
 * koddaki her t('...') çağrısını katalogla karşılaştırır.
 *
 * Ayrıca:
 *  · dillerin birbirine göre eksiğini raporlar
 *  · İSTEMCİ bileşenlerinin kullandığı her namespace'in
 *    app/[locale]/layout.tsx içindeki CLIENT_NAMESPACES listesinde
 *    olduğunu doğrular — eksikse sayfa çalışma anında boş render
 *    ediliyor ve fark edilmesi zor.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const LOCALES = ['tr', 'en', 'ru']
const ROOTS = ['app', 'components', 'lib']

const catalogs = Object.fromEntries(
  LOCALES.map((l) => [l, JSON.parse(readFileSync(`messages/${l}.json`, 'utf8'))])
)

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (['.ts', '.tsx'].includes(extname(full))) out.push(full)
  }
  return out
}

const files = ROOTS.flatMap((r) => walk(r))
const problems = []

// İstemciye gönderilen namespace listesi
const layoutSrc = readFileSync('app/[locale]/layout.tsx', 'utf8')
const clientListMatch = layoutSrc.match(/const CLIENT_NAMESPACES = \[([\s\S]*?)\]/)
const clientNamespaces = new Set(
  clientListMatch ? [...clientListMatch[1].matchAll(/'([\w.]+)'/g)].map((m) => m[1]) : []
)

for (const file of files) {
  const src = readFileSync(file, 'utf8')

  // const t = useTranslations('ns') | getTranslations('ns') | getTranslations({ namespace: 'ns' })
  const bindings = new Map()
  for (const m of src.matchAll(
    /const\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*(?:\{[^}]*namespace:\s*)?['"`]([\w.]+)['"`]/g
  )) {
    bindings.set(m[1], m[2])
  }
  // Promise.all içinde: getTranslations('ns') sırayla destructure edilir
  for (const m of src.matchAll(
    /const\s+\[([^\]]+)\]\s*=\s*await\s+Promise\.all\(\[([\s\S]*?)\]\)/g
  )) {
    const names = m[1].split(',').map((s) => s.trim())
    const calls = [...m[2].matchAll(/getTranslations\(\s*(?:\{[^}]*namespace:\s*)?['"`]([\w.]+)['"`]/g)]
    // Çağrı sırası ile isim sırası birebir eşleşmeyebilir; yalnızca
    // getTranslations olan konumları eşleştiriyoruz.
    const items = m[2].split(/,\s*\n/)
    items.forEach((item, i) => {
      const ns = item.match(/getTranslations\(\s*(?:\{[^}]*namespace:\s*)?['"`]([\w.]+)['"`]/)
      if (ns && names[i]) bindings.set(names[i], ns[1])
    })
    if (calls.length && !items.some((i) => /getTranslations/.test(i))) {
      // ayrıştırılamadı; sessiz geç
    }
  }

  const isClientComponent = /^(['"])use client\1/m.test(src.trimStart().split('\n')[0] ?? '')

  for (const [binding, ns] of bindings) {
    // İstemci bileşeni: namespace tarayıcıya gönderiliyor olmalı.
    if (isClientComponent && !clientNamespaces.has(ns.split('.')[0])) {
      problems.push(
        `${file}  →  '${ns}' CLIENT_NAMESPACES listesinde yok ` +
        `(app/[locale]/layout.tsx)`
      )
    }
    const re = new RegExp(`\\b${binding}(?:\\.rich|\\.raw)?\\(\\s*['"\`]([\\w.]+)['"\`]`, 'g')
    for (const m of src.matchAll(re)) {
      const key = m[1]
      for (const locale of LOCALES) {
        const value = key
          .split('.')
          .reduce((acc, part) => (acc == null ? undefined : acc[part]),
                  ns.split('.').reduce((a, p) => (a == null ? undefined : a[p]), catalogs[locale]))
        if (value === undefined) {
          problems.push(`${file}  →  ${locale}: ${ns}.${key}`)
        }
      }
    }
  }
}

// Diller arası tutarlılık
function flatten(obj, prefix = '', out = new Set()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object') flatten(v, `${prefix}${k}.`, out)
    else out.add(`${prefix}${k}`)
  }
  return out
}
const base = flatten(catalogs.tr)
for (const locale of LOCALES.slice(1)) {
  const other = flatten(catalogs[locale])
  for (const key of base) if (!other.has(key)) problems.push(`messages/${locale}.json  →  eksik: ${key}`)
  for (const key of other) if (!base.has(key)) problems.push(`messages/tr.json  →  eksik: ${key}`)
}

const unique = [...new Set(problems)]
if (unique.length === 0) {
  console.log('✓ Tüm çeviri anahtarları yerinde.')
} else {
  console.error(`✗ ${unique.length} sorun:\n`)
  for (const p of unique) console.error('  ' + p)
  process.exit(1)
}
