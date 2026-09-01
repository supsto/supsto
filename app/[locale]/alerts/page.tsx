import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { ProductImage } from '@/components/domain/product-image'
import { PageHeader } from '@/components/layout/section'
import { Badge } from '@/components/ui/badge'
import { Button, ButtonLink } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Link } from '@/i18n/navigation'
import { deleteAlert } from '@/lib/actions/alert'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'

export const metadata: Metadata = { title: 'Alarmlar', robots: { index: false } }

export default async function AlertsPage() {
  const t = await getTranslations('alerts')
  const supabase = await createClient()

  const { data: alerts } = await supabase
    .from('product_alerts')
    .select('*, product:products ( id, title, slug, images, price, currency, stock_quantity )')
    .order('created_at', { ascending: false })

  return (
    <>
      <PageHeader title={t('title')} description={t('lead')} />

      {alerts && alerts.length > 0 ? (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {alerts.map((a) => {
              const p = a.product as {
                id: string; title: string; slug: string; images: string[]
                price: number | null; currency: string; stock_quantity: number
              } | null
              if (!p) return null

              return (
                <li key={a.id} className="flex items-center gap-3 p-4">
                  <ProductImage
                    src={p.images?.[0]}
                    alt=""
                    sizes="56px"
                    className="size-14 shrink-0 rounded-[10px]"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={{ pathname: '/product/[slug]', params: { slug: p.slug } }}
                      className="line-clamp-1 text-[13px] font-bold hover:text-brand"
                    >
                      {p.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                      {a.kind === 'price_below' ? (
                        <span>
                          {t('priceBelow')} {formatCurrency(a.target_price, p.currency)}
                        </span>
                      ) : (
                        <span>{t('backInStock')}</span>
                      )}
                      <Badge tone={a.triggered_at ? 'success' : 'brand'}>
                        {a.triggered_at ? t('triggered') : t('active')}
                      </Badge>
                    </div>
                  </div>
                  <form action={deleteAlert}>
                    <input type="hidden" name="id" value={a.id} />
                    <Button type="submit" size="sm" variant="danger">
                      {t('remove')}
                    </Button>
                  </form>
                </li>
              )
            })}
          </ul>
        </Card>
      ) : (
        <Card>
          <EmptyState
            title={t('empty')}
            description={t('emptyBody')}
            action={<ButtonLink href="/search" variant="primary">{t('create')}</ButtonLink>}
          />
        </Card>
      )}
    </>
  )
}
