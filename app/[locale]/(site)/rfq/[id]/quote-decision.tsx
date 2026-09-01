'use client'

import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form-status'
import { decideQuote } from '@/lib/actions/quote'
import { IDLE } from '@/lib/types'

/** RFQ sahibinin kabul/ret butonları. Fiyata dokunamaz — DB tetikleyicisi engeller. */
export function QuoteDecision({
  quoteId,
  rfqId,
  disabled,
}: {
  quoteId: string
  rfqId: string
  disabled?: boolean
}) {
  const [state, action, pending] = useActionState(decideQuote, IDLE)

  if (state.status === 'success') {
    return <span className="text-xs font-semibold text-success">{state.message}</span>
  }

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="quote_id" value={quoteId} />
      <input type="hidden" name="rfq_id" value={rfqId} />
      <div className="flex gap-1.5">
        <Button
          type="submit"
          name="status"
          value="rejected"
          size="sm"
          variant="danger"
          disabled={pending || disabled}
        >
          Reddet
        </Button>
        <Button
          type="submit"
          name="status"
          value="accepted"
          size="sm"
          variant="success"
          disabled={pending || disabled}
        >
          Kabul et
        </Button>
      </div>
      {state.status === 'error' ? <FormMessage state={state} /> : null}
    </form>
  )
}
