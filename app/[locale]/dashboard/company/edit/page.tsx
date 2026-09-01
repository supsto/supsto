import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { PageHeader } from '@/components/layout/section'
import { Notice } from '@/components/ui/notice'
import { requireCompany } from '@/lib/auth/panel'
import { CompanyEditForm } from './company-edit-form'

export const metadata: Metadata = { title: 'Firma düzenle', robots: { index: false } }

export default async function CompanyEditPage() {
  const [company, t] = await Promise.all([requireCompany(), getTranslations('auth')])
  if (!company) notFound()

  return (
    <>
      <PageHeader title={company.name} description={t('companyLead')} />
      <Notice tone="neutral" className="mb-4">{t('badgeNotice')}</Notice>
      <CompanyEditForm company={company} />
    </>
  )
}
