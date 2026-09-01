import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { ProductImage } from '@/components/domain/product-image'
import { StockBadge } from '@/components/domain/stock-badge'
import { Badge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/layout/section'
import { Table, TableWrap, Td, Th } from '@/components/ui/table'
import { Link } from '@/i18n/navigation'
import { requireCompany } from '@/lib/auth/panel'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatNumber } from '@/lib/utils'

export const metadata: Metadata = { title: 'Ürünlerim', robots: { index: false } }

const STATUS_TONE = { active: 'success', passive: 'neutral', draft: 'warning' } as const

export default async function PanelProductsPage() {
  const [company, t, tf] = await Promise.all([
    requireCompany(),
    getTranslations('productList'),
    getTranslations('form'),
  ])

  if (!company) {
    return (
      <Card>
        <EmptyState
          title={t('noCompanyTitle')}
          description={t('noCompanyBody')}
          action={<ButtonLink href="/create-company" variant="primary">{t('noCompanyTitle')}</ButtonLink>}
        />
      </Card>
    )
  }

  const supabase = await createClient()
  const { data: products } = await supabase
    .from('products')
    .select('*, price_tiers ( id )')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('lead')}
        action={
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/dashboard/import">{tf('bulkImport')}</ButtonLink>
            <ButtonLink href="/dashboard/products/new" variant="primary">
              {t('newProduct')}
            </ButtonLink>
          </div>
        }
      />

      {products && products.length > 0 ? (
        <Card className="overflow-hidden">
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>{t('product')}</Th>
                  <Th>{tf('basePrice')}</Th>
                  <Th>{tf('moq')}</Th>
                  <Th>{tf('stock')}</Th>
                  <Th>{tf('status')}</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-2">
                    <Td>
                      <div className="flex items-center gap-3">
                        <ProductImage
                          src={p.images?.[0]}
                          alt=""
                          sizes="48px"
                          className="size-12 shrink-0 rounded-[10px]"
                        />
                        <div className="min-w-0">
                          <Link
                            href={{ pathname: '/dashboard/products/[id]', params: { id: p.id } }}
                            className="line-clamp-1 font-bold hover:text-brand"
                          >
                            {p.title}
                          </Link>
                          {p.price_tiers.length > 0 ? (
                            <div className="text-[11px] text-muted">
                              {p.price_tiers.length} {tf('priceTiers').toLowerCase()}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </Td>
                    <Td className="tabular-nums">
                      {p.price_hidden ? '—' : formatCurrency(p.price, p.currency)}
                    </Td>
                    <Td className="tabular-nums">{formatNumber(p.moq)}</Td>
                    <Td><StockBadge quantity={p.stock_quantity} showCount /></Td>
                    <Td>
                      <Badge tone={STATUS_TONE[p.status as keyof typeof STATUS_TONE] ?? 'neutral'}>
                        {tf(`status${p.status.charAt(0).toUpperCase()}${p.status.slice(1)}` as 'statusActive')}
                      </Badge>
                    </Td>
                    <Td>
                      <ButtonLink
                        href={{ pathname: '/dashboard/products/[id]', params: { id: p.id } }}
                        size="sm"
                      >
                        {t('editProduct')}
                      </ButtonLink>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        </Card>
      ) : (
        <Card>
          <EmptyState
            title={t('empty')}
            description={t('emptyBody')}
            action={
              <>
                <ButtonLink href="/dashboard/import">{tf('bulkImport')}</ButtonLink>
                <ButtonLink href="/dashboard/products/new" variant="primary">
                  {t('newProduct')}
                </ButtonLink>
              </>
            }
          />
        </Card>
      )}
    </>
  )
}
