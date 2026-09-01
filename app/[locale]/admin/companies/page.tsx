import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { VerifyToggle } from '@/components/domain/verify-toggle'
import { PageHeader } from '@/components/layout/section'
import { Badge, VerifiedBadge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CompanyAvatar } from '@/components/ui/avatar'
import { Table, TableWrap, Td, Th } from '@/components/ui/table'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatNumber } from '@/lib/utils'

export const metadata: Metadata = { title: 'Firmalar', robots: { index: false } }

export default async function AdminCompaniesPage() {
  const t = await getTranslations('admin')
  const supabase = await createClient()

  const { data: companies } = await supabase
    .from('companies')
    .select('*, products ( id )')
    .order('created_at', { ascending: false })

  return (
    <>
      <PageHeader title={t('companies')} />

      <Card className="overflow-hidden">
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>{t('company')}</Th>
                <Th>{t('city')}</Th>
                <Th>{t('products')}</Th>
                <Th>{t('verified')}</Th>
                <Th>{t('registered')}</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {(companies ?? []).map((c) => (
                <tr key={c.id} className="hover:bg-surface-2">
                  <Td>
                    <div className="flex items-center gap-3">
                      <CompanyAvatar name={c.name} logoUrl={c.logo_url} size="sm" />
                      <span className="line-clamp-1 font-bold">{c.name}</span>
                    </div>
                  </Td>
                  <Td className="text-muted">{c.city ?? '—'}</Td>
                  <Td className="tabular-nums">{formatNumber(c.products.length)}</Td>
                  <Td>
                    {c.verified ? <VerifiedBadge /> : <Badge tone="neutral">{t('notVerified')}</Badge>}
                  </Td>
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
    </>
  )
}
