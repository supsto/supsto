import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { notFound } from 'next/navigation'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { localeMeta, routing } from '@/i18n/routing'
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
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    ),
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

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<'/[locale]'>) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  // Statik render sırasında hangi dilin çevirilerinin kullanılacağını bildirir.
  setRequestLocale(locale)

  return (
    <html lang={localeMeta[locale].htmlLang} className={`${inter.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  )
}
