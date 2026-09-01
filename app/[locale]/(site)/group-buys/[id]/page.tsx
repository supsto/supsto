import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { GroupBuyProgress, GroupBuyStatus } from '@/components/domain/group-buy-progress'
import { ProductImage } from '@/components/domain/product-image'
import { Container, PageHeader } from '@/components/layout/section'
import { Card, CardBody, CardHead } from '@/components/ui/card'
import { Notice } from '@/components/ui/notice'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { getCurrentUser } from '@/lib/auth/session'
import { alternates } from '@/lib/seo'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatNumber } from '@/lib/utils'
import { JoinPool } from './join-pool'

export async function generateMetadata(
  props: PageProps<'/[locale]/group-buys/[id]'>
): Promise<Metadata> {
  const { id, locale } = await props.params
  const t = await getTranslations({ locale, namespace: 'groupBuy' })
  return {
    title: t('title'),
    alternates: alternates(
      { pathname: '/group-buys/[id]', params: { id } },
      locale as Locale
    ),
  }
}

export default async function GroupBuyPage(
  props: PageProps<'/[locale]/group-buys/[id]'>
) {
  const { id } = await props.params
  const [t, user] = await Promise.all([getTranslations('groupBuy'), getCurrentUser()])

  const supabase = await createClient()
  const { data: pool } = await supabase
    .from('group_buys')
    .select(
      `*, product:products ( id, title, slug, unit, images, moq, price, currency,
        company:companies ( id, name, slug ) ),
       group_buy_participants ( id, buyer_id, quantity, created_at )`
    )
    .eq('id', id)
    .maybeSingle()

  if (!pool) notFound()

  const product = pool.product as {
    id: string; title: string; slug: string; unit: string | null
    images: string[]; company: { name: string; slug: string } | null
  } | null
  const participants = pool.group_buy_participants as {
    id: string; buyer_id: string; quantity: number
  }[]
  const mine = participants.find((p) => p.buyer_id === user?.id)

  const expired = new Date(pool.deadline) < new Date()
  const canJoin = !expired && ['open', 'reached'].includes(pool.status)

  return (
    <Container className="py-6">
      <PageHeader
        title={product?.title ?? t('title')}
        description={product?.company?.name}
        action={<GroupBuyStatus status={pool.status} />}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Card className="overflow-hidden">
            {product ? (
              <Link
                href={{ pathname: '/product/[slug]', params: { slug: product.slug } }}
                className="flex items-center gap-4 p-4 hover:bg-surface-2"
              >
                <ProductImage
                  src={product.images?.[0]}
                  alt=""
                  sizes="96px"
                  className="size-24 shrink-0 rounded-xl"
                />
                <div className="min-w-0">
                  <div className="text-sm font-bold">{product.title}</div>
                  <div className="text-xs text-muted">{product.company?.name}</div>
                </div>
              </Link>
            ) : null}
            <CardBody className="border-t border-line">
              <GroupBuyProgress
                committed={pool.committed_quantity}
                target={pool.target_quantity}
                unit={product?.unit ?? null}
              />
              {pool.note ? (
                <p className="mt-4 whitespace-pre-line text-[13px] text-muted">{pool.note}</p>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHead
              title={t('participants')}
              subtitle={formatNumber(participants.length)}
            />
            <CardBody className="pt-0">
              <ul className="divide-y divide-line">
                {participants.map((p, index) => (
                  <li key={p.id} className="flex items-center justify-between py-2.5 text-[13px]">
                    {/* Kimlikler gizli: alıcılar birbirini görmemeli. */}
                    <span className="text-muted">
                      {p.buyer_id === user?.id ? t('yourCommitment') : `#${index + 1}`}
                    </span>
                    <span className="font-bold tabular-nums">
                      {formatNumber(p.quantity)} {product?.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-3">
          <Card>
            <CardBody className="space-y-3">
              <div className="flex justify-between text-[13px]">
                <span className="text-muted">{t('target')}</span>
                <b className="tabular-nums">
                  {formatNumber(pool.target_quantity)} {product?.unit}
                </b>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-muted">{t('committed')}</span>
                <b className="tabular-nums">
                  {formatNumber(pool.committed_quantity)} {product?.unit}
                </b>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-muted">{t('deadline')}</span>
                <b>{formatDate(pool.deadline)}</b>
              </div>
            </CardBody>
          </Card>

          {canJoin ? (
            <JoinPool
              poolId={pool.id}
              signedIn={Boolean(user)}
              currentQuantity={mine?.quantity ?? null}
              unit={product?.unit ?? null}
            />
          ) : (
            <Notice tone="neutral">
              {expired ? t('expired') : t(pool.status as 'ordered')}
            </Notice>
          )}

          {pool.status === 'reached' ? (
            <Notice tone="success">{t('reached')}</Notice>
          ) : null}
        </aside>
      </div>
    </Container>
  )
}
