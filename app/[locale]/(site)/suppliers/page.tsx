import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'


import type { Locale } from '@/i18n/routing'
import { alternates } from '@/lib/seo'

import { Container, PageHeader } from '@/components/layout/section'
import { FilterBar } from '@/components/domain/filter-bar'
import { Pagination } from '@/components/domain/pagination'
import { SupplierCard } from '@/components/domain/supplier-card'
import { ButtonLink } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { getCompanyCities, searchCompanies } from '@/lib/queries/companies'
import { formatNumber } from '@/lib/utils'

export async function generateMetadata(
  props: PageProps<'/[locale]/suppliers'>
): Promise<Metadata> {
  const { locale } = await props.params
  return {
  title: 'Tedarikçiler',
  description: 'Saha doğrulamalı B2B tedarikçileri şehir ve kategoriye göre inceleyin.',
    alternates: await alternates('/suppliers', locale as Locale),
  }
}

const PAGE_SIZE = 24

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function SuppliersPage(props: PageProps<'/[locale]/suppliers'>) {
  const sp = await props.searchParams
  const q = first(sp.q) ?? ''
  const city = first(sp.sehir) ?? ''
  const verified = first(sp.dogrulanmis) === '1'
  const page = Math.max(1, Number(first(sp.sayfa) ?? 1) || 1)

  const [cities, t, tc] = await Promise.all([
    getCompanyCities(),
    getTranslations('list'),
    getTranslations('common'),
  ])
  const { items, total } = await searchCompanies({
    q,
    city: city || undefined,
    verifiedOnly: verified,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  })

  const baseParams = Object.fromEntries(
    Object.entries({ q, sehir: city, dogrulanmis: verified ? '1' : '' }).filter(
      ([, v]) => v
    )
  )

  return (
    <Container className="py-6">
      <PageHeader
        title={t('suppliers')}
        description={t('companiesListed', { count: formatNumber(total) })}
      />

      <FilterBar
        filters={[
          { name: 'q', placeholder: t('searchCompanies'), type: 'text' },
          {
            name: 'sehir',
            placeholder: tc('allCities'),
            options: cities.map((c) => ({ value: c, label: c })),
          },
          {
            name: 'dogrulanmis',
            placeholder: tc('verification'),
            options: [{ value: '1', label: tc('verifiedOnly') }],
          },
        ]}
      />

      {items.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((company) => (
              <SupplierCard key={company.id} company={company} />
            ))}
          </div>
          <Pagination
            total={total}
            pageSize={PAGE_SIZE}
            currentPage={page}
            baseParams={baseParams}
          />
        </>
      ) : (
        <Card>
          <EmptyState
            title={t('noCompanies')}
            description={t('noCompaniesBody')}
            action={<ButtonLink href="/suppliers">{tc('clearFilters')}</ButtonLink>}
          />
        </Card>
      )}
    </Container>
  )
}
