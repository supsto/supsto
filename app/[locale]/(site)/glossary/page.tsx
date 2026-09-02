import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import type { Locale } from '@/i18n/routing'
import { alternates } from '@/lib/seo'

import { Container, PageHeader } from '@/components/layout/section'
import { Card, CardBody } from '@/components/ui/card'
import { TermDefinition } from '@/components/ui/term'

/**
 * Ticaret sözlüğü.
 *
 * Terimleri arayüzde sadeleştirdik ama tamamen atmadık: tedarikçiniz
 * "MOQ" diyecek, gümrükçünüz "GTİP" soracak. Bu sayfa ikisini
 * birbirine bağlar — ve "moq nedir" arayan kullanıcı için de giriş
 * kapısıdır.
 */
export async function generateMetadata(
  props: PageProps<'/[locale]/glossary'>
): Promise<Metadata> {
  const { locale } = await props.params
  const t = await getTranslations({ locale, namespace: 'glossary' })
  return {
    title: t('title'),
    description: t('lead'),
    alternates: await alternates('/glossary', locale as Locale),
  }
}

/** Sözlükteki terimler; sırayı okuma mantığı belirler, alfabe değil. */
const GROUPS = [
  { id: 'basics', terms: ['rfq', 'moq', 'priceTier', 'leadTime', 'sample', 'groupBuy'] },
  { id: 'production', terms: ['oem', 'odm', 'stock', 'variant', 'defect'] },
  { id: 'shipping', terms: ['incoterm', 'exw', 'fob', 'cif', 'ddp', 'pallet'] },
  { id: 'paperwork', terms: ['hsCode', 'proforma', 'escrowNote'] },
] as const

export default async function GlossaryPage() {
  const t = await getTranslations('glossary')

  return (
    <Container className="max-w-3xl py-6">
      <PageHeader title={t('title')} description={t('lead')} />

      <div className="space-y-4">
        {GROUPS.map((group) => (
          <Card key={group.id}>
            <CardBody>
              <h2 className="mb-1 text-sm font-bold">{t(`group_${group.id}`)}</h2>
              <dl>
                {group.terms.map((id) => (
                  <TermDefinition key={id} id={id} />
                ))}
              </dl>
            </CardBody>
          </Card>
        ))}
      </div>
    </Container>
  )
}
