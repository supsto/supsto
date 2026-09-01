import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { notFound } from 'next/navigation'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { localeMeta, routing } from '@/i18n/routing'
import { getMessages } from 'next-intl/server'

import { getSiteUrl } from '@/lib/site-url'
import '../globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  display: 'swap',
})

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata(
  props: LayoutProps<'/[locale]'>
): Promise<Metadata> {
  const { locale } = await props.params
  if (!hasLocale(routing.locales, locale)) return {}

  const t = await getTranslations({ locale, namespace: 'meta' })

  return {
    metadataBase: new URL(await getSiteUrl()),
    title: { default: t('defaultTitle'), template: `%s · Supsto` },
    description: t('defaultDescription'),
    openGraph: {
      type: 'website',
      siteName: 'Supsto',
      locale: localeMeta[locale].ogLocale,
      alternateLocale: routing.locales
        .filter((l) => l !== locale)
        .map((l) => localeMeta[l].ogLocale),
    },
  }
}

/*
  İstemci bileşenlerinin GERÇEKTEN kullandığı namespace'ler.
  Tümünü göndermek her sayfaya ~33 KB ekliyordu; sunucuda kalan
  metinlerin (bilgi sayfaları, ana sayfa, e-posta metinleri…) tarayıcıya
  inmesine gerek yok.

  Yeni bir istemci bileşeni `useTranslations('x')` çağırırsa 'x' buraya
  eklenmeli; yoksa çalışma anında "namespace bulunamadı" hatası verir.
*/
const CLIENT_NAMESPACES = [
  'admin', 'alerts', 'auth', 'common', 'compare', 'cost', 'error',
  'favorites', 'form', 'groupBuy', 'import', 'messages', 'nav',
  'negotiation', 'orders', 'panel', 'profile', 'report', 'reviews',
  'samples',
] as const

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<'/[locale]'>) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  // Statik render sırasında hangi dilin çevirilerinin kullanılacağını bildirir.
  setRequestLocale(locale)

  const messages = await getMessages()
  const clientMessages = Object.fromEntries(
    CLIENT_NAMESPACES.filter((ns) => ns in messages).map((ns) => [ns, messages[ns]])
  )

  return (
    <html lang={localeMeta[locale].htmlLang} className={`${inter.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider messages={clientMessages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
