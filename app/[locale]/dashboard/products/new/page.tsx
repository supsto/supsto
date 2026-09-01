import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { PageHeader } from '@/components/layout/section'
import { ButtonLink } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { requireCompany } from '@/lib/auth/panel'
import { getCategoryTree } from '@/lib/queries/categories'
import { ProductForm } from '../product-form'

export const metadata: Metadata = { title: 'Yeni ürün', robots: { index: false } }

export default async function NewProductPage() {
  const [company, categories, t] = await Promise.all([
    requireCompany(),
    getCategoryTree(),
    getTranslations('productList'),
  ])

  if (!company) {
    return (
      <Card>
        <EmptyState
          title={t('noCompanyTitle')}
          description={t('noCompanyBody')}
          action={<ButtonLink href="/create-company" variant="primary">{t('noCompanyTitle')}</ButtonLink>}
        />
      </Card>
    )
  }

  return (
    <>
      <PageHeader title={t('newProductTitle')} />
      <ProductForm companyId={company.id} categories={categories} />
    </>
  )
}
