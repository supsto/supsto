import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { PageHeader } from '@/components/layout/section'
import { Badge, VerifiedBadge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { Card, CardBody, CardHead } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Notice } from '@/components/ui/notice'
import { Stat } from '@/components/ui/stat'
import { requireCompany } from '@/lib/auth/panel'
import { createClient } from '@/lib/supabase/server'
import { formatNumber } from '@/lib/utils'
import { CertificateManager } from './certificate-manager'

export const metadata: Metadata = { title: 'Firmam', robots: { index: false } }

export default async function CompanyPage() {
  const [company, t, ta, tp, tc] = await Promise.all([
    requireCompany(),
    getTranslations('panel'),
    getTranslations('admin'),
    getTranslations('productList'),
    getTranslations('common'),
  ])

  if (!company) {
    return (
      <Card>
        <EmptyState
          title={tp('noCompanyTitle')}
          description={tp('noCompanyBody')}
          action={<ButtonLink href="/create-company" variant="primary">{tp('noCompanyTitle')}</ButtonLink>}
        />
      </Card>
    )
  }

  const supabase = await createClient()
  const [{ data: certificates }, { data: performance }] = await Promise.all([
    supabase
      .from('company_certificates')
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('company_performance')
      .select('*')
      .eq('company_id', company.id)
      .maybeSingle(),
  ])

  return (
    <>
      <PageHeader
        title={company.name}
        description={[company.city, company.district].filter(Boolean).join(' / ')}
        action={
          <div className="flex items-center gap-2">
            {company.verified ? <VerifiedBadge /> : <Badge tone="warning">{ta('notVerified')}</Badge>}
            <ButtonLink href="/dashboard/company/edit" size="sm" variant="primary">
              {tc('save')}
            </ButtonLink>
            <ButtonLink
              href={{ pathname: '/supplier/[slug]', params: { slug: company.slug } }}
              size="sm"
              target="_blank"
            >
              ↗
            </ButtonLink>
          </div>
        }
      />

      {/* Beyan değil, gerçek veriden karne */}
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t('products')} value={formatNumber(performance?.active_products ?? 0)} />
        <Stat label={t('quotes')} value={formatNumber(performance?.quotes_given ?? 0)} />
        <Stat
          label={ta('verified')}
          value={formatNumber(performance?.quotes_accepted ?? 0)}
        />
        <Stat label={t('orders')} value={formatNumber(performance?.orders_completed ?? 0)} />
      </div>

      {!company.verified ? (
        <Notice tone="warning" className="mb-4">
          {ta('verificationsLead')}
        </Notice>
      ) : null}

      <Card>
        <CardHead title={ta('certificates')} />
        <CardBody className="pt-0">
          <CertificateManager companyId={company.id} certificates={certificates ?? []} />
        </CardBody>
      </Card>
    </>
  )
}
