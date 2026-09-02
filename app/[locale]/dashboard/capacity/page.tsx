import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { Link } from '@/i18n/navigation'
import { PageHeader } from '@/components/layout/section'
import { Badge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { getPrimaryCompany } from '@/lib/auth/session'
import { isExpired, listCompanyCapacity } from '@/lib/queries/capacity'
import { formatDate, formatNumber } from '@/lib/utils'
import { CapacityStatus } from './capacity-status'

export const metadata: Metadata = { title: 'Boş kapasite', robots: { index: false } }

export default async function DashboardCapacityPage() {
  const company = await getPrimaryCompany()
  if (!company) notFound()

  const [offers, t] = await Promise.all([
    listCompanyCapacity(company.id),
    getTranslations('capacity'),
  ])

  return (
    <>
      <PageHeader
        title={t('panelTitle')}
        description={t('panelLead')}
        action={
          <ButtonLink href="/dashboard/capacity/new" variant="primary">
            {t('createCta')}
          </ButtonLink>
        }
      />

      {offers.length === 0 ? (
        <Card>
          <EmptyState
            title={t('panelEmptyTitle')}
            description={t('panelEmptyBody')}
            action={
              <ButtonLink href="/dashboard/capacity/new" variant="primary">
                {t('createCta')}
              </ButtonLink>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {offers.map((offer) => {
            const expired = isExpired(offer)
            return (
              <Card key={offer.id}>
                <CardBody className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-bold">{offer.title}</h2>
                      {/*
                        Süresi geçmiş ilan listede kalır ama açıkça
                        etiketlenir: sahibi neden teklif gelmediğini
                        anlayabilmeli.
                      */}
                      {expired ? (
                        <Badge tone="neutral">{t('expired')}</Badge>
                      ) : offer.status === 'reserved' ? (
                        <Badge tone="warning">{t('statusReserved')}</Badge>
                      ) : offer.status === 'closed' ? (
                        <Badge tone="neutral">{t('statusClosed')}</Badge>
                      ) : (
                        <Badge tone="success">{t('statusOpen')}</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] font-semibold text-brand">
                      {offer.process}
                    </p>
                    <p className="mt-1 text-[11px] text-muted tabular-nums">
                      {formatDate(offer.available_from)} – {formatDate(offer.available_to)}
                      {offer.monthly_units
                        ? ` · ${t('monthly')}: ${formatNumber(offer.monthly_units)} ${offer.unit ?? ''}`
                        : ''}
                    </p>
                  </div>
                  <CapacityStatus id={offer.id} status={offer.status} />
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      <p className="mt-4 text-[11px] text-muted">
        {t('publicHint')}{' '}
        <Link href="/capacity" className="font-semibold text-brand hover:underline">
          {t('publicTitle')}
        </Link>
      </p>
    </>
  )
}
