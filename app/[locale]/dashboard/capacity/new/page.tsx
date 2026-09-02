import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/layout/section'
import { Card, CardBody } from '@/components/ui/card'
import { Notice } from '@/components/ui/notice'
import { getPrimaryCompany } from '@/lib/auth/session'
import { CapacityForm } from './capacity-form'

export const metadata: Metadata = {
  title: 'Boş kapasite ilanı',
  robots: { index: false },
}

export default async function NewCapacityPage() {
  const [company, t] = await Promise.all([
    getPrimaryCompany(),
    getTranslations('capacity'),
  ])
  if (!company) notFound()

  return (
    <>
      <PageHeader title={t('newTitle')} description={t('newLead')} />
      <Card>
        <CardBody>
          <CapacityForm defaultCity={company.city} />
        </CardBody>
      </Card>
      <Notice tone="neutral" className="mt-3">
        {t('newNotice')}
      </Notice>
    </>
  )
}
