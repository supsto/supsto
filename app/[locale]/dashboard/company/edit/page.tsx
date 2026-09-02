import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { PageHeader } from '@/components/layout/section'
import { Notice } from '@/components/ui/notice'
import { requireCompany } from '@/lib/auth/panel'
import { getCountries, getDistricts, getProvinces } from '@/lib/queries/geo'
import { CompanyEditForm } from './company-edit-form'

export const metadata: Metadata = { title: 'Firma düzenle', robots: { index: false } }

export default async function CompanyEditPage({
  params,
}: LayoutProps<'/[locale]'>) {
  const { locale } = await params
  const company = await requireCompany()
  if (!company) notFound()

  const [t, countries, provinces, districts] = await Promise.all([
    getTranslations('auth'),
    getCountries(locale),
    // Kayıtlı ülkenin illeri ilk render'da hazır gelmeli; yoksa form
    // açılışta boş görünür ve kullanıcı seçimini kaybettiğini sanır.
    getProvinces(company.country_code ?? 'TR'),
    // Kayıtlı ilin ilçeleri de sunucuda hazırlanır; istemci açılışta
    // istek atmasın ve liste bir an boş görünmesin.
    company.province_id ? getDistricts(company.province_id) : [],
  ])

  return (
    <>
      <PageHeader title={company.name} description={t('companyLead')} />
      <Notice tone="neutral" className="mb-4">{t('badgeNotice')}</Notice>
      <CompanyEditForm
        company={company}
        countries={countries}
        provinces={provinces}
        districts={districts}
      />
    </>
  )
}
