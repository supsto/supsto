import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { ProductCard } from '@/components/domain/product-card'
import { SupplierCard } from '@/components/domain/supplier-card'
import { PageHeader, SectionHead } from '@/components/layout/section'
import { ButtonLink } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { createClient } from '@/lib/supabase/server'
import type { Company, ProductListItem } from '@/lib/types'

export const metadata: Metadata = { title: 'Favoriler', robots: { index: false } }

export default async function FavoritesPage() {
  const t = await getTranslations('favorites')
  const supabase = await createClient()

  const { data } = await supabase
    .from('favorites')
    .select(
      `id, created_at,
       product:products (
         id, title, slug, price, currency, moq, unit, stock_quantity,
         price_hidden, images, created_at,
         company:companies ( id, name, slug, city, district, verified ),
         category:categories ( id, name, slug )
       ),
       company:companies ( * )`
    )
    .order('created_at', { ascending: false })

  const rows = data ?? []
  const products = rows
    .map((r) => r.product)
    .filter(Boolean) as unknown as ProductListItem[]
  const companies = rows
    .map((r) => r.company)
    .filter(Boolean) as unknown as Company[]

  const isEmpty = products.length === 0 && companies.length === 0

  return (
    <>
      <PageHeader title={t('title')} description={t('lead')} />

      {isEmpty ? (
        <Card>
          <EmptyState
            title={t('empty')}
            description={t('emptyBody')}
            action={<ButtonLink href="/search" variant="primary">{t('products')}</ButtonLink>}
          />
        </Card>
      ) : (
        <div className="space-y-8">
          {products.length > 0 ? (
            <section>
              <SectionHead title={t('products')} />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          ) : null}

          {companies.length > 0 ? (
            <section>
              <SectionHead title={t('suppliers')} />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {companies.map((c) => (
                  <SupplierCard key={c.id} company={c} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </>
  )
}
