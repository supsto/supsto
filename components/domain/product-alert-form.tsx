'use client'

import { useTranslations } from 'next-intl'
import { useActionState, useState } from 'react'

import { Button, ButtonLink } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { FormMessage, SubmitButton } from '@/components/ui/form-status'
import { createAlert } from '@/lib/actions/alert'
import { IDLE } from '@/lib/types'

/** Stok yoksa "gelince haber ver", varsa "fiyat düşerse haber ver". */
export function ProductAlertForm({
  productId,
  inStock,
  signedIn,
  currency,
}: {
  productId: string
  inStock: boolean
  signedIn: boolean
  currency: string
}) {
  const t = useTranslations('alerts')
  const [open, setOpen] = useState(false)
  const [state, action] = useActionState(createAlert, IDLE)

  if (!signedIn) {
    return (
      <ButtonLink href="/login" size="sm" variant="quiet">
        {t('create')}
      </ButtonLink>
    )
  }

  if (state.status === 'success') return <FormMessage state={state} />

  if (!open) {
    return (
      <Button type="button" size="sm" variant="quiet" onClick={() => setOpen(true)}>
        {inStock ? t('priceBelow') : t('backInStock')}
      </Button>
    )
  }

  return (
    <form action={action} className="w-full">
      <FormMessage state={state} />
      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="kind" value={inStock ? 'price_below' : 'back_in_stock'} />

      {inStock ? (
        <Field label={`${t('priceBelow')} (${currency})`} htmlFor="target_price" required>
          <Input id="target_price" name="target_price" type="number" min={0} step="0.01" required />
        </Field>
      ) : null}

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" size="sm" onClick={() => setOpen(false)}>×</Button>
        <SubmitButton variant="default">{t('create')}</SubmitButton>
      </div>
    </form>
  )
}
