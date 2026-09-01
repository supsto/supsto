import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { ProductImage } from '@/components/domain/product-image'
import { StockBadge } from '@/components/domain/stock-badge'
import { Container, PageHeader } from '@/components/layout/section'
import { VerifiedBadge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableWrap, Td, Th } from '@/components/ui/table'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { alternates } from '@/lib/seo'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatNumber } from '@/lib/utils'

export async function generateMetadata(
  props: PageProps<'/[locale]/compare'>
): Promise<Metadata> {
  const { locale } = await props.params
  const t = await getTranslations({ locale, namespace: 'compare' })
  return {
    title: t('title'),
    description: t('lead'),
    robots: { index: false },
    alternates: await alternates('/compare', locale as Locale),
  }
}

export default async function ComparePage(props: PageProps<'/[locale]/compare'>) {
  const sp = await props.searchParams
  const raw = Array.isArray(sp.ids) ? sp.ids[0] : sp.ids
  const ids = (raw ?? '').split(',').filter(Boolean).slice(0, 4)

  const [t, tp] = await Promise.all([
    getTranslations('compare'),
    getTranslations('product'),
  ])

  if (ids.length === 0) {
    return (
      <Container className="py-6">
        <PageHeader title={t('title')} description={t('lead')} />
        <Card>
          <EmptyState
            title={t('empty')}
            description={t('emptyBody')}
            action={<ButtonLink href="/search" variant="primary">{tp('relatedProducts')}</ButtonLink>}
          />
        </Card>
      </Container>
    )
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('*, company:companies ( id, name, slug, city, verified )')
    .in('id', ids)
    .eq('status', 'active')

  // Kullanıcının seçim sırasını koru.
  const products = ids
    .map((id) => (data ?? []).find((p) => p.id === id))
    .filter(Boolean) as NonNullable<typeof data>

  const rows: [string, (p: (typeof products)[number]) => React.ReactNode][] = [
    [tp('supplier'), (p) => {
      const c = p.company as { name: string; slug: string; verified: boolean } | null
      return c ? (
        <div>
          <Link
            href={{ pathname: '/supplier/[slug]', params: { slug: c.slug } }}
            className="font-semibold hover:text-brand"
          >
            {c.name}
          </Link>
          {c.verified ? <VerifiedBadge className="mt-1" /> : null}
        </div>
      ) : '—'
    }],
    [tp('priceOnRequest'), (p) =>
      p.price_hidden ? tp('priceOnRequest') : formatCurrency(p.price, p.currency)],
    [tp('moq'), (p) => `${formatNumber(p.moq)} ${p.unit ?? ''}`],
    [tp('stock'), (p) => <StockBadge quantity={p.stock_quantity} showCount />],
    ['Incoterm', (p) => p.incoterm ?? '—'],
    [tp('avgResponse'), (p) => (p.lead_time_days ? `${p.lead_time_days} gün` : '—')],
    ['Koli içi', (p) => (p.units_per_case ? formatNumber(p.units_per_case) : '—')],
    ['GTİP', (p) => p.hs_code ?? '—'],
  ]

  return (
    <Container className="py-6">
      <PageHeader title={t('title')} description={t('lead')} />

      <Card className="overflow-hidden">
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th className="w-40" />
                {products.map((p) => (
                  <Th key={p.id} className="min-w-52 normal-case">
                    <Link
                      href={{ pathname: '/product/[slug]', params: { slug: p.slug } }}
                      className="block"
                    >
                      <ProductImage
                        src={p.images?.[0]}
                        alt=""
                        sizes="200px"
                        className="mb-2 h-28 w-full rounded-[10px]"
                      />
                      <span className="line-clamp-2 text-[13px] font-bold text-ink hover:text-brand">
                        {p.title}
                      </span>
                    </Link>
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, render]) => (
                <tr key={label}>
                  <Td className="bg-surface-2 font-semibold text-muted">{label}</Td>
                  {products.map((p) => (
                    <Td key={p.id} className="align-top">{render(p)}</Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      </Card>
    </Container>
  )
}
