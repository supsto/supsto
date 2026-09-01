import { getTranslations } from 'next-intl/server'

import { Container, PageHeader } from '@/components/layout/section'
import { Card } from '@/components/ui/card'

interface Section {
  title: string
  body: string
}

/**
 * Kurumsal/hukuki içerik sayfaları. Metin `messages/<dil>.json` içindeki
 * `info.<slug>` altında durur; sayfa dosyaları yalnızca hangi slug'ı
 * göstereceklerini bildirir.
 */
export async function InfoPage({ slug }: { slug: string }) {
  const t = await getTranslations(`info.${slug}`)
  // Diziler t() ile değil t.raw() ile okunur.
  const sections = t.raw('sections') as Section[]

  return (
    <Container className="py-6">
      <PageHeader title={t('title')} description={t('lead')} />
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.title} className="p-5">
            <h2 className="text-sm font-bold">{section.title}</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">{section.body}</p>
          </Card>
        ))}
      </div>
    </Container>
  )
}
