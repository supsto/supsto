import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { notFound, redirect } from 'next/navigation'

import { Container, PageHeader } from '@/components/layout/section'
import { Card, CardBody } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ButtonLink } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { getMyCompanies } from '@/lib/auth/session'
import { getRfqById } from '@/lib/queries/rfqs'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import { QuoteForm } from './quote-form'

export const metadata: Metadata = { title: 'Teklif ver' }

export default async function QuotePage(props: PageProps<'/[locale]/rfq/[id]/quote'>) {
  const { id } = await props.params
  const rfq = await getRfqById(id)
  if (!rfq) notFound()

  // Kapalı RFQ'ya teklif verilemez — kullanıcıyı boş bir formla oyalamayalım.
  if (rfq.status === 'closed') redirect(`/rfq/${rfq.id}`)

  const [companies, t, tHome] = await Promise.all([
    getMyCompanies(),
    getTranslations('newRfq'),
    getTranslations('home'),
  ])

  if (companies.length === 0) {
    return (
      <Container className="py-6">
        <Card className="mx-auto max-w-xl">
          <EmptyState
            title={t('needCompanyTitle')}
            description={t('needCompanyBody')}
            action={
              <>
                <ButtonLink href={{ pathname: '/rfq/[id]', params: { id: rfq.id } }}>{t('goBack')}</ButtonLink>
                <ButtonLink href="/create-company" variant="primary">
                  {tHome('ctaCreateCompany')}
                </ButtonLink>
              </>
            }
          />
        </Card>
      </Container>
    )
  }

  return (
    <Container className="py-6">
      <PageHeader title="Teklif ver" description={rfq.title} />

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardBody>
            <QuoteForm rfqId={rfq.id} companies={companies} />
          </CardBody>
        </Card>

        <aside className="space-y-3">
          <Notice tone="brand">
            <b className="mb-1 block">{t('buyerExpectation')}</b>
            {rfq.quantity ? (
              <div>{t('quantity')}: {formatNumber(rfq.quantity)} {rfq.unit}</div>
            ) : null}
            {rfq.target_price ? (
              <div>{t('targetPrice')}: {formatCurrency(rfq.target_price)}</div>
            ) : null}
            {rfq.delivery_days ? (
              <div>{t('deliveryWithin', { days: rfq.delivery_days })}</div>
            ) : null}
            {rfq.deadline ? (
              <div>
                {t('deadline')}: {formatDate(rfq.deadline)}
              </div>
            ) : null}
          </Notice>

          <Notice tone="neutral">
            {t('quotePrivacy')}
          </Notice>
        </aside>
      </div>
    </Container>
  )
}
