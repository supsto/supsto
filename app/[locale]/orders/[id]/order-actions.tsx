'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHead } from '@/components/ui/card'
import { FormMessage } from '@/components/ui/form-status'
import { Notice } from '@/components/ui/notice'
import { advanceOrder } from '@/lib/actions/order'
import { IDLE } from '@/lib/types'

type Next = { status: string; labelKey: string; variant: 'primary' | 'success' }

/**
 * Sıradaki adımı ve onu kimin yapabileceğini gösterir. Kuralın kaynağı
 * veritabanındaki enforce_order_transition tetikleyicisidir; burası
 * yalnızca aynı kuralı arayüze yansıtır.
 */
function nextStep(status: string, isBuyer: boolean, isSupplier: boolean): Next | null {
  if (isSupplier) {
    if (status === 'pending') return { status: 'confirmed', labelKey: 'confirmOrder', variant: 'primary' }
    if (status === 'confirmed') return { status: 'in_production', labelKey: 'startProduction', variant: 'primary' }
    if (status === 'in_production') return { status: 'shipped', labelKey: 'markShipped', variant: 'primary' }
  }
  if (isBuyer) {
    if (status === 'shipped') return { status: 'delivered', labelKey: 'markDelivered', variant: 'success' }
    if (status === 'delivered') return { status: 'completed', labelKey: 'markCompleted', variant: 'success' }
  }
  return null
}

export function OrderActions({
  orderId,
  status,
  isBuyer,
  isSupplier,
}: {
  orderId: string
  status: string
  isBuyer: boolean
  isSupplier: boolean
}) {
  const t = useTranslations('orders')
  const [state, action, pending] = useActionState(advanceOrder, IDLE)

  const next = nextStep(status, isBuyer, isSupplier)
  const canCancel =
    (isBuyer || isSupplier) &&
    ['pending', 'confirmed', 'in_production'].includes(status)

  if (!next && !canCancel) return null

  return (
    <Card>
      <CardHead title={t('advance')} />
      <CardBody className="pt-0">
        <FormMessage state={state} />
        {next ? (
          <form action={action}>
            <input type="hidden" name="order_id" value={orderId} />
            <input type="hidden" name="status" value={next.status} />
            <Button type="submit" variant={next.variant} className="w-full" disabled={pending}>
              {t(next.labelKey as 'confirmOrder')}
            </Button>
          </form>
        ) : (
          <Notice tone="neutral">{t('waitingOther')}</Notice>
        )}

        {canCancel ? (
          <form action={action} className="mt-2">
            <input type="hidden" name="order_id" value={orderId} />
            <input type="hidden" name="status" value="cancelled" />
            <Button type="submit" variant="danger" size="sm" className="w-full" disabled={pending}>
              {t('cancel')}
            </Button>
          </form>
        ) : null}
      </CardBody>
    </Card>
  )
}
