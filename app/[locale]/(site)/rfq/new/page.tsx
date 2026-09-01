import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'


import type { Locale } from '@/i18n/routing'
import { alternates } from '@/lib/seo'

import { Container, PageHeader } from '@/components/layout/section'
import { Card, CardBody } from '@/components/ui/card'
import { Notice } from '@/components/ui/notice'
import { getCategoryTree } from '@/lib/queries/categories'
import { getCompanyCities } from '@/lib/queries/companies'
import { RfqForm } from './rfq-form'

export async function generateMetadata(
  props: PageProps<'/[locale]/rfq/new'>
): Promise<Metadata> {
  const { locale } = await props.params
  return {
  title: 'RFQ oluştur',
  description: 'İhtiyacınızı yayınlayın, tedarikçilerden teklif toplayın.',
    alternates: await alternates('/rfq/new', locale as Locale),
  }
}

export default async function NewRfqPage(props: PageProps<'/[locale]/rfq/new'>) {
  const sp = await props.searchParams
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  // Ana sayfadaki hızlı formdan gelen değerler.
  const prefill = {
    title: first(sp.title) ?? '',
    quantity: first(sp.quantity) ?? '',
    categoryId: first(sp.category) ?? '',
  }

  // Oturum kontrolü proxy.ts'te; buraya giriş yapmadan gelinemez.
  const [tree, cities, t] = await Promise.all([
    getCategoryTree(),
    getCompanyCities(),
    getTranslations('newRfq'),
  ])

  return (
    <Container className="py-6">
      <PageHeader
        title={t('title')}
        description={t('lead')}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardBody>
            <RfqForm categories={tree} cities={cities} prefill={prefill} />
          </CardBody>
        </Card>

        <aside className="space-y-3">
          <Notice tone="brand">
            <b className="mb-1 block">{t('tipTitle')}</b>
            {t('tipBody')}
          </Notice>
          <Notice tone="neutral">
            {t('visibility')}
          </Notice>
        </aside>
      </div>
    </Container>
  )
}
