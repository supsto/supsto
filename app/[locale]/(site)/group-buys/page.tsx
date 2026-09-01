import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { GroupBuyProgress, GroupBuyStatus } from '@/components/domain/group-buy-progress'
import { ProductImage } from '@/components/domain/product-image'
import { Container, PageHeader } from '@/components/layout/section'
import { ButtonLink } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Notice } from '@/components/ui/notice'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { alternates } from '@/lib/seo'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatNumber } from '@/lib/utils'

export async function generateMetadata(
  props: PageProps<'/[locale]/group-buys'>
): Promise<Metadata> {
  const { locale } = await props.params
  const t = await getTranslations({ locale, namespace: 'groupBuy' })
  return {
    title: t('title'),
    description: t('lead'),
    alternates: await alternates('/group-buys', locale as Locale),
  }
}

export default async function GroupBuysPage() {
  const t = await getTranslations('groupBuy')
  const supabase = await createClient()

  const { data: pools } = await supabase
    .from('group_buys')
    .select(
      `*, product:products ( id, title, slug, unit, images, moq,
        company:companies ( id, name, slug ) ),
       group_buy_participants ( id )`
    )
    .in('status', ['open', 'reached'])
    .gte('deadline', new Date().toISOString().slice(0, 10))
    .order('deadline', { ascending: true })

  return (
    <Container className="py-6">
      <PageHeader title={t('title')} description={t('lead')} />
      <Notice tone="brand" className="mb-4">
        {t('explainer')}
      </Notice>

      {pools && pools.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pools.map((pool) => {
            const product = pool.product as {
              id: string; title: string; slug: string; unit: string | null
              images: string[]; company: { name: string } | null
            } | null
            const participants = (pool.group_buy_participants as { id: string }[]).length

            return (
              <Card key={pool.id} className="flex flex-col overflow-hidden">
                <Link
                  href={{ pathname: '/group-buys/[id]', params: { id: pool.id } }}
                  className="flex flex-1 flex-col"
                >
                  <ProductImage
                    src={product?.images?.[0]}
                    alt=""
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="h-36 w-full"
                  />
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="line-clamp-2 text-sm font-bold">{product?.title}</h2>
                      <GroupBuyStatus status={pool.status} />
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-muted">
                      {product?.company?.name}
                    </p>

                    <GroupBuyProgress
                      committed={pool.committed_quantity}
                      target={pool.target_quantity}
                      unit={product?.unit ?? null}
                      className="mt-auto pt-4"
                    />

                    <div className="mt-2.5 flex justify-between text-[10px] text-muted">
                      <span>{t('participants')}: {formatNumber(participants)}</span>
                      <span>{t('deadline')}: {formatDate(pool.deadline)}</span>
                    </div>
                  </div>
                </Link>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <EmptyState
            title={t('empty')}
            description={t('emptyBody')}
            action={<ButtonLink href="/search" variant="primary">{t('product')}</ButtonLink>}
          />
        </Card>
      )}
    </Container>
  )
}
