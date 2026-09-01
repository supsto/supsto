'use client'

import { useTranslations } from 'next-intl'
import { useActionState, useState } from 'react'

import { Button, ButtonLink } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/field'
import { FormMessage, SubmitButton } from '@/components/ui/form-status'
import { requestSample } from '@/lib/actions/sample'
import { IDLE } from '@/lib/types'

export function SampleRequestForm({
  companyId,
  productId,
  signedIn,
}: {
  companyId: string
  productId: string
  signedIn: boolean
}) {
  const t = useTranslations('samples')
  const [open, setOpen] = useState(false)
  const [state, action] = useActionState(requestSample, IDLE)
  const errors = state.status === 'error' ? (state.fieldErrors ?? {}) : {}

  if (!signedIn) {
    return <ButtonLink href="/login">{t('request')}</ButtonLink>
  }

  if (state.status === 'success') {
    return <FormMessage state={state} />
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        {t('request')}
      </Button>
    )
  }

  return (
    <form action={action} className="w-full space-y-3">
      <FormMessage state={state} />
      <input type="hidden" name="company_id" value={companyId} />
      <input type="hidden" name="product_id" value={productId} />

      <Field label={t('quantity')} htmlFor="sample_qty" className="max-w-32">
        <Input id="sample_qty" name="quantity" type="number" min={1} max={100} defaultValue={1} />
      </Field>
      <Field
        label={t('address')}
        htmlFor="shipping_address"
        required
        error={errors.shipping_address}
      >
        <Textarea id="shipping_address" name="shipping_address" rows={3} required />
      </Field>
      <Field label={t('note')} htmlFor="sample_note">
        <Textarea id="sample_note" name="message" rows={2} maxLength={1000} />
      </Field>

      <div className="flex justify-end gap-2">
        <Button type="button" onClick={() => setOpen(false)}>×</Button>
        <SubmitButton>{t('send')}</SubmitButton>
      </div>
    </form>
  )
}
