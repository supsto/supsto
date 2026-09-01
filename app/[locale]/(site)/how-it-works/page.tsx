import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { InfoPage } from '@/components/domain/info-page'
import type { Locale } from '@/i18n/routing'
import { alternates } from '@/lib/seo'

const SLUG = 'how-it-works' as const
const HREF = '/how-it-works' as const

export async function generateMetadata(
  props: PageProps<'/[locale]/how-it-works'>
): Promise<Metadata> {
  const { locale } = await props.params
  const t = await getTranslations({ locale, namespace: `info.${SLUG}` })

  return {
    title: t('title'),
    description: t('lead'),
    alternates: alternates(HREF, locale as Locale),
  }
}

export default function Page() {
  return <InfoPage slug={SLUG} />
}
