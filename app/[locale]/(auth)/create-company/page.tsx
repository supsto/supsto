import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { Card, CardBody } from '@/components/ui/card'
import { Notice } from '@/components/ui/notice'
import { getCompanyCities } from '@/lib/queries/companies'
import { CompanyForm } from './company-form'

export const metadata: Metadata = {
  title: 'Firma oluştur',
  robots: { index: false },
}

export default async function CreateCompanyPage() {
  const [cities, t] = await Promise.all([
    getCompanyCities(),
    getTranslations('auth'),
  ])

  return (
    <div className="w-full max-w-2xl">
      <Card>
        <CardBody>
          <h1 className="text-xl font-extrabold">{t('companyTitle')}</h1>
          <p className="mb-5 mt-1 text-sm text-muted">
            {t('companyLead')}
          </p>
          <CompanyForm cities={cities} />
        </CardBody>
      </Card>

      <Notice tone="neutral" className="mt-3">
        {t('badgeNotice')}
      </Notice>
    </div>
  )
}
