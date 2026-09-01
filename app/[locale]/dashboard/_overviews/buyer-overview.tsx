import { getTranslations } from 'next-intl/server'

import { QuoteStatusBadge } from '@/components/domain/quote-status'
import { RfqRow } from '@/components/domain/rfq-row'
import { PageHeader } from '@/components/layout/section'
import { ButtonLink } from '@/components/ui/button'
import { Card, CardBody, CardHead } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Stat } from '@/components/ui/stat'
import { Link } from '@/i18n/navigation'
import type { PanelContext } from '@/lib/auth/panel'
import { searchRfqs } from '@/lib/queries/rfqs'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatNumber, formatRelative } from '@/lib/utils'

/**
 * Perakendeci özeti: alım tarafının işleri. Gelen teklifler en üstte
 * çünkü karar bekleyen tek şey odur.
 */
export async function BuyerOverview({ ctx }: { ctx: PanelContext }) {
  const t = await getTranslations('panel')
  const supabase = await createClient()

  const [myRfqs, quotes, orders, favorites, pools] = await Promise.all([
    searchRfqs({ buyerId: ctx.userId, status: 'all', limit: 5 }),
    // RLS gereği yalnızca kendi RFQ'larına gelen teklifler döner.
    supabase
      .from('quotes')
      .select('*, company:companies ( name, slug ), rfq:rfqs ( id, title )')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('buyer_id', ctx.userId)
      .in('status', ['pending', 'confirmed', 'in_production', 'shipped']),
    supabase.from('favorites').select('id', { count: 'exact', head: true }),
    supabase
      .from('group_buy_participants')
      .select('id', { count: 'exact', head: true })
      .eq('buyer_id', ctx.userId),
  ])

  const openCount = myRfqs.items.filter((r) => r.status === 'open').length
  const quoteRows = quotes.data ?? []

  return (
    <>
      <PageHeader
        title={t('buyerTitle')}
        description={t('buyerLead')}
        action={
          <ButtonLink href="/rfq/new" variant="primary">
            {t('createRfq')}
          </ButtonLink>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t('openRfqs')} value={formatNumber(openCount)} />
        <Stat label={t('quotesReceived')} value={formatNumber(quoteRows.length)} />
        <Stat label={t('activeOrders')} value={formatNumber(orders.count ?? 0)} />
        <Stat label={t('savedItems')} value={formatNumber(favorites.count ?? 0)} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHead
            title={t('recentQuotes')}
            subtitle={t('recentQuotesLead')}
            action={<ButtonLink href="/rfq" size="sm">{t('viewAll')}</ButtonLink>}
          />
          <CardBody className="pt-1.5">
            {quoteRows.length > 0 ? (
              <ul className="divide-y divide-line">
                {quoteRows.map((q) => {
                  const company = q.company as { name: string } | null
                  const rfq = q.rfq as { id: string; title: string } | null
                  return (
                    <li key={q.id}>
                      <Link
                        href={
                          rfq
                            ? { pathname: '/rfq/[id]', params: { id: rfq.id } }
                            : '/rfq'
                        }
                        className="flex items-center justify-between gap-3 py-3 hover:bg-surface-2"
                      >
                        <div className="min-w-0">
                          <div className="line-clamp-1 text-[13px] font-bold">
                            {company?.name ?? '—'}
                          </div>
                          <div className="line-clamp-1 text-[11px] text-muted">
                            {rfq?.title} · {formatRelative(q.created_at)}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-[13px] font-bold tabular-nums">
                            {formatCurrency(q.price, q.currency)}
                          </div>
                          <QuoteStatusBadge status={q.status} />
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <EmptyState
                title={t('noQuotesYet')}
                action={
                  <ButtonLink href="/rfq/new" variant="primary">
                    {t('createRfq')}
                  </ButtonLink>
                }
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHead
            title={t('myRfqs')}
            action={<ButtonLink href="/rfq/new" size="sm">{t('new')}</ButtonLink>}
          />
          <CardBody className="pt-1.5">
            {myRfqs.items.length > 0 ? (
              myRfqs.items.map((rfq) => <RfqRow key={rfq.id} rfq={rfq} />)
            ) : (
              <EmptyState
                title={t('noRfqs')}
                description={t('noRfqsBody')}
                action={
                  <ButtonLink href="/rfq/new" variant="primary">
                    {t('firstRfq')}
                  </ButtonLink>
                }
              />
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-4">
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[13px] font-bold">{t('groupBuys')}</div>
            <div className="text-[11px] text-muted">
              {t('joinedPools')}: {formatNumber(pools.count ?? 0)}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/group-buys">{t('groupBuys')}</ButtonLink>
            <ButtonLink href="/suppliers" variant="primary">
              {t('browseSuppliers')}
            </ButtonLink>
          </div>
        </CardBody>
      </Card>
    </>
  )
}
