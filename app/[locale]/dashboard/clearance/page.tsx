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
import { createClient } from '@/lib/supabase/server'
import { softFail } from '@/lib/queries/safe'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'

export const metadata: Metadata = { title: 'Fazla stok', robots: { index: false } }

export default async function DashboardClearancePage() {
  const company = await getPrimaryCompany()
  if (!company) notFound()

  const t = await getTranslations('clearance')
  const supabase = await createClient()

  /*
    Kendi ilanları: süresi geçenler de listede kalır ama etiketlenir.
    Satıcı neden görüntü almadığını anlayabilmeli.
  */
  const { data, error } = await supabase
    .from('products')
    .select('id, title, slug, price, currency, stock_quantity, unit, clearance_until, clearance_reason')
    .eq('company_id', company.id)
    .eq('clearance', true)
    .order('clearance_until', { ascending: true })

  const items = error ? softFail('dashboardClearance', error, []) : (data ?? [])
  const today = new Date().toISOString().slice(0, 10)

  return (
    <>
      <PageHeader
        title={t('panelTitle')}
        description={t('panelLead')}
        action={
          <ButtonLink href="/dashboard/products" variant="primary">
            {t('manageProducts')}
          </ButtonLink>
        }
      />

      {items.length === 0 ? (
        <Card>
          <EmptyState
            title={t('panelEmptyTitle')}
            description={t('panelEmptyBody')}
            action={
              <ButtonLink href="/dashboard/products" variant="primary">
                {t('manageProducts')}
              </ButtonLink>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const expired = item.clearance_until != null && item.clearance_until < today
            return (
              <Card key={item.id}>
                <CardBody className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={{ pathname: '/product/[slug]', params: { slug: item.slug } }}
                        className="text-sm font-bold hover:text-brand"
                      >
                        {item.title}
                      </Link>
                      {expired ? (
                        <Badge tone="neutral">{t('expired')}</Badge>
                      ) : (
                        <Badge tone="warning">{t('active')}</Badge>
                      )}
                    </div>
                    {item.clearance_reason ? (
                      <p className="mt-1 text-[12px] text-muted">{item.clearance_reason}</p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-muted tabular-nums">
                      {formatCurrency(item.price, item.currency)} ·{' '}
                      {t('stock', {
                        n: formatNumber(item.stock_quantity),
                        unit: item.unit ?? '',
                      })}
                      {item.clearance_until
                        ? ` · ${t('until', { date: formatDate(item.clearance_until) })}`
                        : ''}
                    </p>
                  </div>
                  <ButtonLink
                    href={{ pathname: '/dashboard/products/[id]', params: { id: item.id } }}
                  >
                    {t('edit')}
                  </ButtonLink>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      <p className="mt-4 text-[11px] text-muted">
        {t('publicHint')}{' '}
        <Link href="/clearance" className="font-semibold text-brand hover:underline">
          {t('publicTitle')}
        </Link>
      </p>
    </>
  )
}
