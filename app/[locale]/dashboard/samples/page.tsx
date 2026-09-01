import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { PageHeader } from '@/components/layout/section'
import { Badge, type Tone } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableWrap, Td, Th } from '@/components/ui/table'
import { decideSample } from '@/lib/actions/sample'
import { requireCompany } from '@/lib/auth/panel'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatNumber } from '@/lib/utils'

export const metadata: Metadata = { title: 'Numune talepleri', robots: { index: false } }

const TONE: Record<string, Tone> = {
  pending: 'warning', approved: 'brand', sent: 'success', rejected: 'danger',
}

export default async function SamplesPage() {
  const [company, t] = await Promise.all([requireCompany(), getTranslations('samples')])
  if (!company) {
    return <Card><EmptyState title={t('empty')} description={t('emptyBody')} /></Card>
  }

  const supabase = await createClient()
  const { data: requests } = await supabase
    .from('sample_requests')
    .select('*, product:products ( id, title ), buyer:profiles ( id, full_name )')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })

  return (
    <>
      <PageHeader title={t('title')} description={t('lead')} />

      {requests && requests.length > 0 ? (
        <Card className="overflow-hidden">
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>{t('buyer')}</Th>
                  <Th>{t('product')}</Th>
                  <Th>{t('quantity')}</Th>
                  <Th>{t('address')}</Th>
                  <Th>{t('status')}</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => {
                  const buyer = r.buyer as { full_name: string | null } | null
                  const product = r.product as { title: string } | null
                  return (
                    <tr key={r.id} className="align-top hover:bg-surface-2">
                      <Td>
                        <div className="font-bold">{buyer?.full_name ?? '—'}</div>
                        <div className="text-[11px] text-faint">{formatDate(r.created_at)}</div>
                      </Td>
                      <Td className="text-muted">{product?.title ?? '—'}</Td>
                      <Td className="tabular-nums">{formatNumber(r.quantity)}</Td>
                      <Td className="max-w-56 whitespace-normal text-[11px] text-muted">
                        {r.shipping_address ?? '—'}
                        {r.message ? (
                          <p className="mt-1 italic">{r.message}</p>
                        ) : null}
                      </Td>
                      <Td>
                        <Badge tone={TONE[r.status] ?? 'neutral'}>
                          {t(r.status as 'pending')}
                        </Badge>
                      </Td>
                      <Td>
                        <div className="flex justify-end gap-1.5">
                          {r.status === 'pending' ? (
                            <>
                              <form action={decideSample}>
                                <input type="hidden" name="id" value={r.id} />
                                <input type="hidden" name="status" value="rejected" />
                                <Button type="submit" size="sm" variant="danger">
                                  {t('reject')}
                                </Button>
                              </form>
                              <form action={decideSample}>
                                <input type="hidden" name="id" value={r.id} />
                                <input type="hidden" name="status" value="approved" />
                                <Button type="submit" size="sm" variant="success">
                                  {t('approve')}
                                </Button>
                              </form>
                            </>
                          ) : r.status === 'approved' ? (
                            <form action={decideSample}>
                              <input type="hidden" name="id" value={r.id} />
                              <input type="hidden" name="status" value="sent" />
                              <Button type="submit" size="sm" variant="primary">
                                {t('markSent')}
                              </Button>
                            </form>
                          ) : null}
                        </div>
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          </TableWrap>
        </Card>
      ) : (
        <Card><EmptyState title={t('empty')} description={t('emptyBody')} /></Card>
      )}
    </>
  )
}
