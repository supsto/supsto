import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { VerifyToggle } from '@/components/domain/verify-toggle'
import { PageHeader } from '@/components/layout/section'
import { CompanyAvatar } from '@/components/ui/avatar'
import { ButtonLink } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableWrap, Td, Th } from '@/components/ui/table'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatNumber } from '@/lib/utils'

export const metadata: Metadata = { title: 'Doğrulama merkezi', robots: { index: false } }

export default async function VerificationsPage() {
  const t = await getTranslations('admin')
  const supabase = await createClient()

  // Doğrulanmamışlar önce; admin sırayla ilerlesin.
  const { data: companies } = await supabase
    .from('companies')
    .select('*, products ( id )')
    .eq('verified', false)
    .order('created_at', { ascending: true })

  return (
    <>
      <PageHeader title={t('verifications')} description={t('verificationsLead')} />

      {companies && companies.length > 0 ? (
        <Card className="overflow-hidden">
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>{t('company')}</Th>
                  <Th>{t('city')}</Th>
                  <Th>{t('products')}</Th>
                  <Th>{t('registered')}</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-2">
                    <Td>
                      <div className="flex items-center gap-3">
                        <CompanyAvatar name={c.name} logoUrl={c.logo_url} size="sm" />
                        <div className="min-w-0">
                          <div className="line-clamp-1 font-bold">{c.name}</div>
                          {c.phone ? (
                            <div className="text-[11px] text-muted">{c.phone}</div>
                          ) : null}
                        </div>
                      </div>
                    </Td>
                    <Td className="text-muted">
                      {[c.city, c.district].filter(Boolean).join(' / ') || '—'}
                    </Td>
                    <Td className="tabular-nums">{formatNumber(c.products.length)}</Td>
                    <Td className="text-muted">{formatDate(c.created_at)}</Td>
                    <Td>
                      <div className="flex justify-end gap-2">
                        <ButtonLink
                          href={{ pathname: '/supplier/[slug]', params: { slug: c.slug } }}
                          size="sm"
                          target="_blank"
                        >
                          ↗
                        </ButtonLink>
                        <VerifyToggle companyId={c.id} verified={c.verified} />
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        </Card>
      ) : (
        <Card>
          <EmptyState title={t('noPending')} description={t('noPendingBody')} />
        </Card>
      )}
    </>
  )
}
