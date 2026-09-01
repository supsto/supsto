import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'


import type { Locale } from '@/i18n/routing'
import { alternates } from '@/lib/seo'
import { Link } from '@/i18n/navigation'

import { Container, PageHeader } from '@/components/layout/section'
import { FilterBar } from '@/components/domain/filter-bar'
import { Pagination } from '@/components/domain/pagination'
import { Badge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableWrap, Td, Th } from '@/components/ui/table'
import { getCategoryTree } from '@/lib/queries/categories'
import { searchRfqs } from '@/lib/queries/rfqs'
import { formatDate, formatNumber, formatRelative } from '@/lib/utils'

export async function generateMetadata(
  props: PageProps<'/[locale]/rfq'>
): Promise<Metadata> {
  const { locale } = await props.params
  return {
  title: 'Teklif talepleri (RFQ)',
  description:
    'Alıcıların yayınladığı güncel toptan alım ihtiyaçlarını inceleyin ve tedarikçi olarak teklif verin.',
    alternates: await alternates('/rfq', locale as Locale),
  }
}

const PAGE_SIZE = 20

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function RfqListPage(props: PageProps<'/[locale]/rfq'>) {
  const sp = await props.searchParams
  const q = first(sp.q) ?? ''
  const categorySlug = first(sp.kategori) ?? ''
  const statusParam = first(sp.durum) ?? ''
  const page = Math.max(1, Number(first(sp.sayfa) ?? 1) || 1)

  const [tree, t, tl, tc] = await Promise.all([
    getCategoryTree(),
    getTranslations('rfq'),
    getTranslations('list'),
    getTranslations('common'),
  ])
  const selected = tree.find((c) => c.slug === categorySlug)

  const { items, total } = await searchRfqs({
    q,
    categoryIds: selected
      ? [selected.id, ...selected.children.map((c) => c.id)]
      : undefined,
    status: statusParam === 'kapali' ? 'closed' : statusParam === 'tumu' ? 'all' : 'open',
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  })

  const baseParams = Object.fromEntries(
    Object.entries({ q, kategori: categorySlug, durum: statusParam }).filter(([, v]) => v)
  )

  return (
    <Container className="py-6">
      <PageHeader
        title={t('listTitle')}
        description={tl('rfqsListed', { count: formatNumber(total) })}
        action={
          <ButtonLink href="/rfq/new" variant="primary">
            {t('createNew')}
          </ButtonLink>
        }
      />

      <FilterBar
        filters={[
          { name: 'q', placeholder: tl('searchRfqs'), type: 'text' },
          {
            name: 'kategori',
            placeholder: tc('allCategories'),
            options: tree.map((c) => ({ value: c.slug, label: c.name })),
          },
          {
            name: 'durum',
            placeholder: tl('statusOpen'),
            options: [
              { value: 'kapali', label: tl('statusClosed') },
              { value: 'tumu', label: tl('statusAll') },
            ],
          },
        ]}
      />

      {items.length > 0 ? (
        <>
          <Card className="overflow-hidden">
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>{t('title')}</Th>
                    <Th>{t('category')}</Th>
                    <Th>{t('location')}</Th>
                    <Th>{t('quantity')}</Th>
                    <Th>{t('deadline')}</Th>
                    <Th>{t('quotes')}</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((rfq) => (
                    <tr key={rfq.id} className="hover:bg-surface-2">
                      <Td>
                        <Link
                          href={{ pathname: '/rfq/[id]', params: { id: rfq.id } }}
                          className="font-bold hover:text-brand"
                        >
                          {rfq.title}
                        </Link>
                        <div className="text-[11px] text-faint">
                          {formatRelative(rfq.created_at)}
                        </div>
                      </Td>
                      <Td className="text-muted">{rfq.category?.name ?? '—'}</Td>
                      <Td className="text-muted">{rfq.city ?? '—'}</Td>
                      <Td className="tabular-nums">
                        {rfq.quantity
                          ? `${formatNumber(rfq.quantity)} ${rfq.unit ?? ''}`
                          : '—'}
                      </Td>
                      <Td className="text-muted">{formatDate(rfq.deadline)}</Td>
                      <Td>
                        <Badge tone={rfq.quote_count > 0 ? 'warning' : 'neutral'}>
                          {rfq.quote_count}
                        </Badge>
                      </Td>
                      <Td>
                        <ButtonLink href={{ pathname: '/rfq/[id]', params: { id: rfq.id } }} size="sm">
                          {t('view')}
                        </ButtonLink>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          </Card>
          <Pagination
            total={total}
            pageSize={PAGE_SIZE}
            currentPage={page}
            baseParams={baseParams}
          />
        </>
      ) : (
        <Card>
          <EmptyState
            title={tl('noRfqs')}
            description={tl('noRfqsBody')}
            action={
              <ButtonLink href="/rfq/new" variant="primary">
                {t('createNew')}
              </ButtonLink>
            }
          />
        </Card>
      )}
    </Container>
  )
}
