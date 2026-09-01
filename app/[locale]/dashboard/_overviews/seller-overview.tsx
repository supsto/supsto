import { getTranslations } from 'next-intl/server'

import { RatingStars } from '@/components/domain/rating-stars'
import { RfqRow } from '@/components/domain/rfq-row'
import { PageHeader, SectionHead } from '@/components/layout/section'
import { ButtonLink } from '@/components/ui/button'
import { Card, CardBody, CardHead } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Notice } from '@/components/ui/notice'
import { Stat } from '@/components/ui/stat'
import { Link } from '@/i18n/navigation'
import type { PanelContext } from '@/lib/auth/panel'
import { searchRfqs } from '@/lib/queries/rfqs'
import { createClient } from '@/lib/supabase/server'
import { formatNumber } from '@/lib/utils'

const LOW_STOCK = 500

/**
 * Toptancı özeti: "bugün ne yapmalıyım?" sorusuna yanıt verir.
 * Metrikler değil, BEKLEYEN İŞLER öne çıkar.
 */
export async function SellerOverview({ ctx }: { ctx: PanelContext }) {
  const [t, tp] = await Promise.all([
    getTranslations('panel'),
    getTranslations('productList'),
  ])
  const company = ctx.company

  if (!company) {
    return (
      <>
        <PageHeader title={t('sellerTitle')} description={t('sellerLead')} />
        <Card>
          <EmptyState
            title={tp('noCompanyTitle')}
            description={tp('noCompanyBody')}
            action={
              <ButtonLink href="/create-company" variant="primary">
                {tp('noCompanyTitle')}
              </ButtonLink>
            }
          />
        </Card>
      </>
    )
  }

  const supabase = await createClient()
  const [
    active, drafts, pendingQuotes, wonQuotes, openOrders, lowStock, samples, opportunities,
  ] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true })
      .eq('company_id', company.id).eq('status', 'active'),
    supabase.from('products').select('id', { count: 'exact', head: true })
      .eq('company_id', company.id).eq('status', 'draft'),
    supabase.from('quotes').select('id', { count: 'exact', head: true })
      .eq('company_id', company.id).eq('status', 'pending'),
    supabase.from('quotes').select('id', { count: 'exact', head: true })
      .eq('company_id', company.id).eq('status', 'accepted'),
    supabase.from('orders').select('id', { count: 'exact', head: true })
      .eq('company_id', company.id).in('status', ['pending', 'confirmed', 'in_production']),
    supabase.from('products').select('id', { count: 'exact', head: true })
      .eq('company_id', company.id).eq('status', 'active').lt('stock_quantity', LOW_STOCK),
    supabase.from('sample_requests').select('id', { count: 'exact', head: true })
      .eq('company_id', company.id).eq('status', 'pending'),
    searchRfqs({ limit: 5 }),
  ])

  const actions = (
    [
      { label: t('ordersToFulfil'), href: '/orders', n: openOrders.count ?? 0 },
      { label: t('pendingSamples'), href: '/dashboard/samples', n: samples.count ?? 0 },
      { label: t('lowStock'), href: '/dashboard/products', n: lowStock.count ?? 0 },
      { label: t('draftProducts'), href: '/dashboard/products', n: drafts.count ?? 0 },
    ] as const
  ).filter((a) => a.n > 0)

  return (
    <>
      <PageHeader
        title={t('sellerTitle')}
        description={t('sellerLead')}
        action={
          <ButtonLink href="/dashboard/products/new" variant="primary">
            {t('addProduct')}
          </ButtonLink>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t('activeProducts')} value={formatNumber(active.count ?? 0)} />
        <Stat label={t('openQuotes')} value={formatNumber(pendingQuotes.count ?? 0)} />
        <Stat label={t('wonQuotes')} value={formatNumber(wonQuotes.count ?? 0)} />
        <Card className="p-4">
          <div className="text-xs text-muted">{t('rating')}</div>
          {company.rating_average ? (
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-2xl font-extrabold tabular-nums">
                {company.rating_average.toFixed(1)}
              </span>
              <RatingStars rating={company.rating_average} />
            </div>
          ) : (
            <div className="mt-1.5 text-2xl font-extrabold text-muted">—</div>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHead title={t('needsAction')} />
          <CardBody className="pt-0">
            {actions.length > 0 ? (
              <ul className="divide-y divide-line">
                {actions.map((a) => (
                  <li key={a.label}>
                    <Link
                      href={a.href}
                      className="flex items-center justify-between gap-3 py-3 text-[13px] hover:text-brand"
                    >
                      <span className="font-semibold">{a.label}</span>
                      <span className="grid min-w-6 place-items-center rounded-pill bg-warning-soft px-2 py-0.5 text-xs font-bold text-warning">
                        {formatNumber(a.n)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Notice tone="success">{t('noAction')}</Notice>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHead
            title={t('opportunities')}
            subtitle={t('opportunitiesLead')}
            action={<ButtonLink href="/rfq" size="sm">{t('viewAll')}</ButtonLink>}
          />
          <CardBody className="pt-1.5">
            {opportunities.items.length > 0 ? (
              opportunities.items.map((rfq) => <RfqRow key={rfq.id} rfq={rfq} />)
            ) : (
              <EmptyState title={t('noAction')} />
            )}
          </CardBody>
        </Card>
      </div>

      {!company.verified ? (
        <section className="mt-6">
          <SectionHead title={t('setupChecklist')} />
          <Notice tone="warning">
            <Link href="/profile" className="font-bold underline">
              {t('profile')}
            </Link>{' '}
            — {t('sellerLead')}
          </Notice>
        </section>
      ) : null}
    </>
  )
}
