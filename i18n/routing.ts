import { defineRouting } from 'next-intl/routing'

export const locales = ['tr', 'en', 'ru'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'tr'

/** Dil seçici ve hreflang etiketleri için. */
export const localeMeta: Record<Locale, { label: string; htmlLang: string; ogLocale: string }> = {
  tr: { label: 'Türkçe', htmlLang: 'tr-TR', ogLocale: 'tr_TR' },
  en: { label: 'English', htmlLang: 'en', ogLocale: 'en_US' },
  ru: { label: 'Русский', htmlLang: 'ru', ogLocale: 'ru_RU' },
}

/**
 * Kanonik rota → dile göre görünen yol.
 *
 * Soldaki anahtar dosya sistemindeki yoldur (app/[locale]/product/[slug]).
 * Sağdaki değerler kullanıcının adres çubuğunda gördüğü yollardır. proxy.ts
 * gelen çevrilmiş yolu kanonik olana rewrite eder; adres çubuğu değişmez.
 *
 * Rusça sluglar Latin harfle çeviri yazımdır — Rus ticari sitelerinin
 * yaygın pratiği; analitik ve paylaşımda yüzde kodlamasına dönüşmez.
 */
export const pathnames = {
  '/': '/',

  '/search': { tr: '/arama', en: '/search', ru: '/poisk' },
  '/categories': { tr: '/kategoriler', en: '/categories', ru: '/kategorii' },
  '/category/[slug]': {
    tr: '/kategori/[slug]',
    en: '/category/[slug]',
    ru: '/kategoriya/[slug]',
  },
  '/product/[slug]': {
    tr: '/urun/[slug]',
    en: '/product/[slug]',
    ru: '/tovar/[slug]',
  },
  '/suppliers': { tr: '/tedarikciler', en: '/suppliers', ru: '/postavshchiki' },
  '/supplier/[slug]': {
    tr: '/tedarikci/[slug]',
    en: '/supplier/[slug]',
    ru: '/postavshchik/[slug]',
  },

  '/rfq': { tr: '/rfq', en: '/rfq', ru: '/zapros' },
  '/rfq/new': { tr: '/rfq/yeni', en: '/rfq/new', ru: '/zapros/novyy' },
  '/rfq/[id]': { tr: '/rfq/[id]', en: '/rfq/[id]', ru: '/zapros/[id]' },
  '/rfq/[id]/quote': {
    tr: '/rfq/[id]/teklif',
    en: '/rfq/[id]/quote',
    ru: '/zapros/[id]/predlozhenie',
  },

  '/login': { tr: '/giris', en: '/login', ru: '/vhod' },
  '/register': { tr: '/kayit', en: '/register', ru: '/registratsiya' },
  '/verify': { tr: '/dogrula', en: '/verify', ru: '/podtverzhdenie' },
  '/create-company': {
    tr: '/firma-olustur',
    en: '/create-company',
    ru: '/sozdat-kompaniyu',
  },
  '/dashboard': { tr: '/panel', en: '/dashboard', ru: '/kabinet' },

  '/about': { tr: '/hakkimizda', en: '/about', ru: '/o-nas' },
  '/how-it-works': {
    tr: '/nasil-calisir',
    en: '/how-it-works',
    ru: '/kak-eto-rabotaet',
  },
  '/for-buyers': {
    tr: '/alicilar-icin',
    en: '/for-buyers',
    ru: '/dlya-pokupateley',
  },
  '/for-suppliers': {
    tr: '/tedarikciler-icin',
    en: '/for-suppliers',
    ru: '/dlya-postavshchikov',
  },
  '/verification': {
    tr: '/saha-dogrulamasi',
    en: '/verification',
    ru: '/proverka-postavshchikov',
  },
  '/faq': { tr: '/sss', en: '/faq', ru: '/voprosy-i-otvety' },
  '/contact': { tr: '/iletisim', en: '/contact', ru: '/kontakty' },

  '/terms': {
    tr: '/kullanim-sartlari',
    en: '/terms',
    ru: '/usloviya-ispolzovaniya',
  },
  '/privacy': { tr: '/gizlilik', en: '/privacy', ru: '/konfidentsialnost' },
  // KVKK Türkiye'ye özgü bir mevzuat; her dilde aynı kısaltmayla anılır.
  '/kvkk': '/kvkk',
} as const

export const routing = defineRouting({
  locales,
  defaultLocale,
  // Varsayılan dil de önek alır: '/' ve '/tr' aynı içeriği sunup
  // yinelenen içerik (duplicate content) cezası doğurmasın.
  localePrefix: 'always',
  pathnames,
})
