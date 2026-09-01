import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { PageHeader } from '@/components/layout/section'
import { ButtonLink } from '@/components/ui/button'
import { Stat } from '@/components/ui/stat'
import { createClient } from '@/lib/supabase/server'
import { formatNumber } from '@/lib/utils'

export const metadata: Metadata = { title: 'Yönetim', robots: { index: false } }

export default async function AdminHomePage() {
  const t = await getTranslations('admin')
  const supabase = await createClient()

  const count = (table: 'companies' | 'products' | 'rfqs' | 'orders' | 'profiles') =>
    supabase.from(table).select('id', { count: 'exact', head: true })

  const [companies, verified, products, rfqs, orders, users] = await Promise.all([
    count('companies'),
    supabase.from('companies').select('id', { count: 'exact', head: true }).eq('verified', true),
    count('products'),
    supabase.from('rfqs').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    count('orders'),
    count('profiles'),
  ])

  const pending = (companies.count ?? 0) - (verified.count ?? 0)

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('lead')}
        action={
          pending > 0 ? (
            <ButtonLink href="/admin/verifications" variant="primary">
              {t('verifications')} ({formatNumber(pending)})
            </ButtonLink>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label={t('statTotalCompanies')} value={formatNumber(companies.count ?? 0)} />
        <Stat label={t('statVerified')} value={formatNumber(verified.count ?? 0)} />
        <Stat label={t('statProducts')} value={formatNumber(products.count ?? 0)} />
        <Stat label={t('statOpenRfqs')} value={formatNumber(rfqs.count ?? 0)} />
        <Stat label={t('statOrders')} value={formatNumber(orders.count ?? 0)} />
        <Stat label={t('statUsers')} value={formatNumber(users.count ?? 0)} />
      </div>
    </>
  )
}
