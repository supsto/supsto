import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { OrderProgress, OrderStatusBadge } from '@/components/domain/order-status'
import { PageHeader } from '@/components/layout/section'
import { Card, CardBody, CardHead } from '@/components/ui/card'
import { getPanelContext } from '@/lib/auth/panel'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate, formatNumber, formatRelative } from '@/lib/utils'
import { OrderActions } from './order-actions'

export const metadata: Metadata = { title: 'Sipariş', robots: { index: false } }

export default async function OrderPage(props: PageProps<'/[locale]/orders/[id]'>) {
  const { id } = await props.params
  const [ctx, t] = await Promise.all([getPanelContext(), getTranslations('orders')])
  if (!ctx) notFound()

  const supabase = await createClient()
  const [{ data: order }, { data: events }] = await Promise.all([
    supabase
      .from('orders')
      .select('*, company:companies ( id, name, slug ), buyer:profiles ( id, full_name )')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('order_events')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: true }),
  ])

  if (!order) notFound()

  const iAmBuyer = order.buyer_id === ctx.userId
  const isSupplier = ctx.companies.some((c) => c.id === order.company_id)
  const company = order.company as { name: string } | null
  const buyer = order.buyer as { full_name: string | null } | null

  const rows: [string, string][] = [
    [t('counterparty'), iAmBuyer ? (company?.name ?? '—') : (buyer?.full_name ?? '—')],
    [t('quantity'), `${formatNumber(order.quantity)} ${order.unit ?? ''}`.trim()],
    [t('unitPrice'), formatCurrency(order.unit_price, order.currency)],
    [t('total'), formatCurrency(order.total_amount, order.currency)],
    [t('incoterm'), order.incoterm ?? '—'],
    [t('paymentTerms'), order.payment_terms ?? '—'],
    [t('expectedDelivery'), formatDate(order.expected_delivery)],
  ]

  return (
    <>
      <PageHeader
        title={order.code}
        description={order.title}
        action={<OrderStatusBadge status={order.status} />}
      />

      <Card className="mb-4">
        <CardBody>
          <OrderProgress status={order.status} />
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHead title={t('details')} />
          <CardBody className="pt-0">
            <dl>
              {rows.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 border-b border-line py-3 text-[13px] last:border-b-0"
                >
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-right font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>

        <div className="space-y-4">
          <OrderActions
            orderId={order.id}
            status={order.status}
            isBuyer={iAmBuyer}
            isSupplier={isSupplier}
          />

          <Card>
            <CardHead title={t('timeline')} />
            <CardBody className="pt-0">
              <ol className="relative space-y-3 pl-4">
                {(events ?? []).map((e) => (
                  <li key={e.id} className="relative text-xs">
                    <span
                      className="absolute -left-4 top-1.5 size-2 rounded-full bg-brand"
                      aria-hidden="true"
                    />
                    <div className="font-semibold">
                      {t(e.to_status as 'pending')}
                    </div>
                    <time dateTime={e.created_at} className="text-[10px] text-faint">
                      {formatRelative(e.created_at)}
                    </time>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  )
}
