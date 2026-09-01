import { getTranslations } from 'next-intl/server'

import { Notice } from '@/components/ui/notice'
import { locales, type Locale } from '@/i18n/routing'

/**
 * Ürün ve firma metinlerini tedarikçi kendi dilinde yazar. Okuduğu sayfa
 * kendi dilinde değilse kullanıcı bunu bilmeli — sessizce yabancı dilde
 * içerik göstermek yerine açıkça söylüyoruz.
 *
 * (Kategoriler çevrilidir; ürün/firma içeriği için makine çevirisi Faz 2.)
 */
export async function ContentLanguageNotice({
  contentLanguage,
  currentLocale,
}: {
  contentLanguage: string
  currentLocale: Locale
}) {
  if (contentLanguage === currentLocale) return null
  if (!locales.includes(contentLanguage as Locale)) return null

  const t = await getTranslations('content')

  return (
    <Notice tone="neutral" className="mt-3">
      {t('sourceLanguage', { language: t(contentLanguage as Locale) })}
    </Notice>
  )
}
