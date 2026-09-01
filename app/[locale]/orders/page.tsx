import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { OrderStatusBadge } from '@/components/domain/order-status'
import { PageHeader } from '@/components/layout/section'
import { ButtonLink } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableWrap, Td, Th } from '@/components/ui/table'
import { Link } from '@/i18n/navigation'
import { getPanelContext } from '@/lib/auth/panel'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'

export const metadata: Metadata = { title: 'Siparişler', robots: { index: false } }

export default async function OrdersPage() {
  const [ctx, t] = await Promise.all([getPanelContext(), getTranslations('orders')])
  const supabase = await createClient()

  // RLS hem alıcı hem tedarikçi tarafını döndürür; ayrı sorgu gerekmez.
  const { data: orders } = await supabase
    .from('orders')
    .select('*, company:companies ( id, name, slug ), buyer:profiles ( id, full_name )')
    .order('created_at', { ascending: false })

  return (
    <>
      <PageHeader title={t('title')} description={t('lead')} />

      {orders && orders.length > 0 ? (
        <Card className="overflow-hidden">
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>{t('code')}</Th>
                  <Th>{t('counterparty')}</Th>
                  <Th>{t('quantity')}</Th>
                  <Th>{t('amount')}</Th>
                  <Th>{t('status')}</Th>
                  <Th>{t('created')}</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const iAmBuyer = o.buyer_id === ctx?.userId
                  const company = o.company as { name: string } | null
                  const buyer = o.buyer as { full_name: string | null } | null
                  return (
                    <tr key={o.id} className="hover:bg-surface-2">
                      <Td>
                        <Link
                          href={{ pathname: '/orders/[id]', params: { id: o.id } }}
                          className="font-bold hover:text-brand"
                        >
                          {o.code}
                        </Link>
                        <div className="line-clamp-1 text-[11px] text-muted">{o.title}</div>
                      </Td>
                      <Td className="text-muted">
                        {iAmBuyer ? (company?.name ?? '—') : (buyer?.full_name ?? '—')}
                      </Td>
                      <Td className="tabular-nums">
                        {formatNumber(o.quantity)} {o.unit}
                      </Td>
                      <Td className="font-bold tabular-nums">
                        {formatCurrency(o.total_amount, o.currency)}
                      </Td>
                      <Td><OrderStatusBadge status={o.status} /></Td>
                      <Td className="text-muted">{formatDate(o.created_at)}</Td>
                      <Td>
                        <ButtonLink
                          href={{ pathname: '/orders/[id]', params: { id: o.id } }}
                          size="sm"
                        >
                          {t('view')}
                        </ButtonLink>
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          </TableWrap>
        </Card>
      ) : (
        <Card>
          <EmptyState title={t('empty')} description={t('emptyBody')} />
        </Card>
      )}
    </>
  )
}
