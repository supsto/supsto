import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import type { Locale } from '@/i18n/routing'
import { alternates } from '@/lib/seo'

import { Container, PageHeader } from '@/components/layout/section'
import { ProductCard } from '@/components/domain/product-card'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { searchProducts } from '@/lib/queries/products'
import { formatNumber } from '@/lib/utils'

/**
 * Fazla stok pazarı.
 *
 * Her depoda sezonu geçmiş, sipariş iptalinden kalmış, renk tutmamış
 * parti vardır. Normal katalogda kaybolur çünkü alıcı "indirimli parti"
 * diye aramaz. Ayrı vitrin satıcıya nakit, alıcıya fiyat sağlar.
 */
export async function generateMetadata(
  props: PageProps<'/[locale]/clearance'>
): Promise<Metadata> {
  const { locale } = await props.params
  const t = await getTranslations({ locale, namespace: 'clearance' })
  return {
    title: t('publicTitle'),
    description: t('publicLead'),
    alternates: await alternates('/clearance', locale as Locale),
  }
}

export default async function ClearancePage() {
  const [{ items, total }, t] = await Promise.all([
    searchProducts({ clearanceOnly: true, limit: 48 }),
    getTranslations('clearance'),
  ])

  return (
    <Container className="py-6">
      <PageHeader title={t('publicTitle')} description={t('publicLead')} />

      {items.length === 0 ? (
        <Card>
          <EmptyState title={t('emptyTitle')} description={t('emptyBody')} />
        </Card>
      ) : (
        <>
          <p className="mb-3 text-[13px] text-muted">
            {t('found', { count: formatNumber(total) })}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {items.map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index < 4} />
            ))}
          </div>
        </>
      )}
    </Container>
  )
}
