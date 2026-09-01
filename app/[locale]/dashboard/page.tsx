import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'

import { Container, PageHeader, SectionHead } from '@/components/layout/section'
import { SignOutButton } from '@/components/layout/sign-out-button'
import { RfqRow } from '@/components/domain/rfq-row'
import { Badge, VerifiedBadge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { Card, CardBody, CardHead } from '@/components/ui/card'
import { CompanyAvatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { Notice } from '@/components/ui/notice'
import { Stat } from '@/components/ui/stat'
import { getCurrentProfile, getCurrentUser, getMyCompanies } from '@/lib/auth/session'
import { getCompanyStats } from '@/lib/queries/companies'
import { searchRfqs } from '@/lib/queries/rfqs'
import { formatNumber } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Panel',
  robots: { index: false },
}

export default async function PanelPage() {
  // Oturum garantisi proxy.ts'te; buradaki user yalnızca id için.
  const [user, profile, companies, t, trfq, thome] = await Promise.all([
    getCurrentUser(),
    getCurrentProfile(),
    getMyCompanies(),
    getTranslations('dashboard'),
    getTranslations('rfq'),
    getTranslations('home'),
  ])

  const isSupplier = companies.length > 0
  const [myRfqs, openRfqs, companyStats] = await Promise.all([
    user
      ? searchRfqs({ buyerId: user.id, status: 'all', limit: 5 })
      : Promise.resolve({ items: [], total: 0 }),
    isSupplier ? searchRfqs({ limit: 5 }) : Promise.resolve({ items: [], total: 0 }),
    companies[0] ? getCompanyStats(companies[0].id) : Promise.resolve(null),
  ])

  return (
    <Container className="py-6">
      <PageHeader
        title={t('greeting', { name: profile?.full_name ?? 'Supsto' })}
        description={t('lead')}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ButtonLink href="/rfq/new" variant="primary">
              {trfq('createNew')}
            </ButtonLink>
            <SignOutButton />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t('myRfqs')} value={formatNumber(myRfqs.total)} />
        <Stat
          label={t('myOpenRfqs')}
          value={formatNumber(myRfqs.items.filter((r) => r.status === 'open').length)}
        />
        <Stat
          label={t('quotesReceived')}
          value={formatNumber(myRfqs.items.reduce((sum, r) => sum + r.quote_count, 0))}
        />
        <Stat
          label={isSupplier ? t('quotesSent') : t('myCompanies')}
          value={formatNumber(companyStats?.quoteCount ?? companies.length)}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* ---- Alıcı tarafı ---- */}
        <Card>
          <CardHead
            title={t('myRfqs')}
            subtitle={t('myRfqsLead')}
            action={
              <ButtonLink href="/rfq/new" size="sm">
                {t('new')}
              </ButtonLink>
            }
          />
          <CardBody className="pt-1.5">
            {myRfqs.items.length > 0 ? (
              myRfqs.items.map((rfq) => <RfqRow key={rfq.id} rfq={rfq} />)
            ) : (
              <EmptyState
                title={t('noRfqs')}
                description={t('noRfqsBody')}
                action={
                  <ButtonLink href="/rfq/new" variant="primary">
                    {t('firstRfq')}
                  </ButtonLink>
                }
              />
            )}
          </CardBody>
        </Card>

        {/* ---- Tedarikçi tarafı ---- */}
        <Card>
          <CardHead
            title={isSupplier ? t('rfqOpportunities') : t('areYouSupplier')}
            subtitle={
              isSupplier
                ? t('rfqOpportunitiesLead')
                : t('areYouSupplierLead')
            }
            action={
              isSupplier ? (
                <ButtonLink href="/rfq" size="sm">
                  {t('all')}
                </ButtonLink>
              ) : undefined
            }
          />
          <CardBody className="pt-1.5">
            {isSupplier ? (
              openRfqs.items.length > 0 ? (
                openRfqs.items.map((rfq) => <RfqRow key={rfq.id} rfq={rfq} />)
              ) : (
                <EmptyState title={t('noOpenRfq')} />
              )
            ) : (
              <EmptyState
                title={t('noCompany')}
                description={t('noCompanyBody')}
                action={
                  <ButtonLink href="/create-company" variant="primary">
                    {thome('ctaCreateCompany')}
                  </ButtonLink>
                }
              />
            )}
          </CardBody>
        </Card>
      </div>

      {/* ---- Firmalarım ---- */}
      {isSupplier ? (
        <section className="mt-6">
          <SectionHead
            title={t('myCompanies')}
            action={
              <ButtonLink href="/create-company" size="sm">
                {t('addCompany')}
              </ButtonLink>
            }
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {companies.map((company) => (
              <Card key={company.id} className="flex items-start gap-3 p-4">
                <CompanyAvatar name={company.name} logoUrl={company.logo_url} />
                <div className="min-w-0 flex-1">
                  <Link
                    href={{ pathname: '/supplier/[slug]', params: { slug: company.slug } }}
                    className="line-clamp-2 text-[13px] font-bold hover:text-brand"
                  >
                    {company.name}
                  </Link>
                  <div className="mt-1 text-[11px] text-muted">
                    {[company.city, company.district].filter(Boolean).join(' / ') || '—'}
                  </div>
                  <div className="mt-2">
                    {company.verified ? (
                      <VerifiedBadge />
                    ) : (
                      <Badge tone="warning">{t('awaitingVerification')}</Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <Notice tone="neutral" className="mt-6">
        {t('phase2')}
      </Notice>
    </Container>
  )
}
