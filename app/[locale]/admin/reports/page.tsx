import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { PageHeader } from '@/components/layout/section'
import { Badge, type Tone } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableWrap, Td, Th } from '@/components/ui/table'
import { Link } from '@/i18n/navigation'
import { resolveReport } from '@/lib/actions/report'
import { createClient } from '@/lib/supabase/server'
import { formatRelative } from '@/lib/utils'

export const metadata: Metadata = { title: 'Moderasyon', robots: { index: false } }

const TONE: Record<string, Tone> = {
  open: 'warning', reviewing: 'brand', resolved: 'success', dismissed: 'neutral',
}

export default async function ReportsPage() {
  const t = await getTranslations('report')
  const supabase = await createClient()

  const { data: reports } = await supabase
    .from('reports')
    .select(
      // reports iki kolonla profiles'a bağlı (reporter_id, reviewed_by);
      // hangisi olduğunu açıkça belirtmezsek PostgREST hata verir.
      `*, reporter:profiles!reports_reporter_id_fkey ( full_name ),
       product:products ( id, title, slug ),
       company:companies ( id, name, slug )`
    )
    .order('status', { ascending: true })
    .order('created_at', { ascending: false })

  return (
    <>
      <PageHeader title={t('queue')} description={t('queueLead')} />

      {reports && reports.length > 0 ? (
        <Card className="overflow-hidden">
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>{t('target')}</Th>
                  <Th>{t('reason')}</Th>
                  <Th>{t('reporter')}</Th>
                  <Th>{t('status')}</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => {
                  const product = r.product as { title: string; slug: string } | null
                  const company = r.company as { name: string; slug: string } | null
                  const reporter = r.reporter as { full_name: string | null } | null

                  return (
                    <tr key={r.id} className="align-top hover:bg-surface-2">
                      <Td>
                        {product ? (
                          <Link
                            href={{ pathname: '/product/[slug]', params: { slug: product.slug } }}
                            className="font-bold hover:text-brand"
                            target="_blank"
                          >
                            {product.title} ↗
                          </Link>
                        ) : company ? (
                          <Link
                            href={{ pathname: '/supplier/[slug]', params: { slug: company.slug } }}
                            className="font-bold hover:text-brand"
                            target="_blank"
                          >
                            {company.name} ↗
                          </Link>
                        ) : (
                          <span className="font-bold">RFQ</span>
                        )}
                        <div className="text-[10px] text-faint">
                          {formatRelative(r.created_at)}
                        </div>
                      </Td>
                      <Td>
                        <Badge tone="neutral">{t(r.reason as 'spam')}</Badge>
                        {r.detail ? (
                          <p className="mt-1 max-w-56 whitespace-normal text-[11px] text-muted">
                            {r.detail}
                          </p>
                        ) : null}
                      </Td>
                      <Td className="text-muted">{reporter?.full_name ?? '—'}</Td>
                      <Td>
                        <Badge tone={TONE[r.status] ?? 'neutral'}>
                          {t(r.status as 'open')}
                        </Badge>
                      </Td>
                      <Td>
                        {r.status === 'open' || r.status === 'reviewing' ? (
                          <div className="flex justify-end gap-1.5">
                            <form action={resolveReport}>
                              <input type="hidden" name="id" value={r.id} />
                              <input type="hidden" name="status" value="dismissed" />
                              <Button type="submit" size="sm">{t('dismiss')}</Button>
                            </form>
                            <form action={resolveReport}>
                              <input type="hidden" name="id" value={r.id} />
                              <input type="hidden" name="status" value="resolved" />
                              <Button type="submit" size="sm" variant="success">
                                {t('resolve')}
                              </Button>
                            </form>
                          </div>
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
          <EmptyState title={t('noReports')} />
        </Card>
      )}
    </>
  )
}
