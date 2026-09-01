'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form-status'
import { createOrderFromQuote } from '@/lib/actions/order'
import { IDLE } from '@/lib/types'

/** Kabul edilmiş teklifi takip edilebilir bir siparişe dönüştürür. */
export function CreateOrderButton({ quoteId }: { quoteId: string }) {
  const t = useTranslations('orders')
  const [state, action, pending] = useActionState(createOrderFromQuote, IDLE)

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="quote_id" value={quoteId} />
      <Button type="submit" size="sm" variant="primary" disabled={pending}>
        {t('createFromQuote')}
      </Button>
      {state.status === 'error' ? <FormMessage state={state} /> : null}
    </form>
  )
}
