import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { PageHeader } from '@/components/layout/section'
import { Badge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { Card, CardBody, CardHead } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableWrap, Td, Th } from '@/components/ui/table'
import { requireCompany } from '@/lib/auth/panel'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatNumber } from '@/lib/utils'
import { ImportForm } from './import-form'

export const metadata: Metadata = { title: 'Toplu yükleme', robots: { index: false } }

export default async function ImportPage() {
  const [company, t, tp] = await Promise.all([
    requireCompany(),
    getTranslations('import'),
    getTranslations('productList'),
  ])

  if (!company) {
    return (
      <Card>
        <EmptyState
          title={tp('noCompanyTitle')}
          description={tp('noCompanyBody')}
          action={<ButtonLink href="/create-company" variant="primary">{tp('noCompanyTitle')}</ButtonLink>}
        />
      </Card>
    )
  }

  const supabase = await createClient()
  const { data: jobs } = await supabase
    .from('import_jobs')
    .select('*')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <>
      <PageHeader title={t('title')} description={t('lead')} />

      <Card className="mb-4">
        <CardBody>
          <ImportForm companyId={company.id} />
        </CardBody>
      </Card>

      {jobs && jobs.length > 0 ? (
        <Card>
          <CardHead title={t('history')} />
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>{t('file')}</Th>
                  <Th>{t('ok')}</Th>
                  <Th>{t('failed')}</Th>
                  <Th>{formatDate(new Date()) ? 'Tarih' : ''}</Th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id}>
                    <Td>{j.filename}</Td>
                    <Td><Badge tone="success">{formatNumber(j.ok_rows)}</Badge></Td>
                    <Td>
                      {j.failed_rows > 0 ? (
                        <Badge tone="danger">{formatNumber(j.failed_rows)}</Badge>
                      ) : '—'}
                    </Td>
                    <Td className="text-muted">{formatDate(j.created_at)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        </Card>
      ) : null}
    </>
  )
}
