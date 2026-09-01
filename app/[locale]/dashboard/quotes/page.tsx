import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { QuoteStatusBadge } from '@/components/domain/quote-status'
import { PageHeader } from '@/components/layout/section'
import { ButtonLink } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableWrap, Td, Th } from '@/components/ui/table'
import { requireCompany } from '@/lib/auth/panel'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'

export const metadata: Metadata = { title: 'Tekliflerim', robots: { index: false } }

export default async function MyQuotesPage() {
  const [company, t, tr] = await Promise.all([
    requireCompany(),
    getTranslations('panel'),
    getTranslations('rfq'),
  ])
  if (!company) {
    return <Card><EmptyState title={t('quotes')} /></Card>
  }

  const supabase = await createClient()
  const { data: quotes } = await supabase
    .from('quotes')
    .select('*, rfq:rfqs ( id, title, quantity, unit, status )')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })

  return (
    <>
      <PageHeader title={t('quotes')} />

      {quotes && quotes.length > 0 ? (
        <Card className="overflow-hidden">
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>RFQ</Th>
                  <Th>{tr('unitPrice')}</Th>
                  <Th>MOQ</Th>
                  <Th>{tr('delivery')}</Th>
                  <Th>{tr('status')}</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => {
                  const rfq = q.rfq as { id: string; title: string } | null
                  return (
                    <tr key={q.id} className="hover:bg-surface-2">
                      <Td>
                        <div className="line-clamp-1 font-bold">{rfq?.title ?? '—'}</div>
                        <div className="text-[11px] text-faint">{formatDate(q.created_at)}</div>
                      </Td>
                      <Td className="font-bold tabular-nums">
                        {formatCurrency(q.price, q.currency)}
                      </Td>
                      <Td className="tabular-nums">{q.moq ? formatNumber(q.moq) : '—'}</Td>
                      <Td>{q.delivery_days ? tr('days', { count: q.delivery_days }) : '—'}</Td>
                      <Td><QuoteStatusBadge status={q.status} /></Td>
                      <Td>
                        {rfq ? (
                          <ButtonLink
                            href={{ pathname: '/rfq/[id]', params: { id: rfq.id } }}
                            size="sm"
                          >
                            {tr('view')}
                          </ButtonLink>
                        ) : null}
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
          <EmptyState
            title={t('quotes')}
            description={tr('noQuotesBody')}
            action={<ButtonLink href="/rfq" variant="primary">{tr('listTitle')}</ButtonLink>}
          />
        </Card>
      )}
    </>
  )
}
