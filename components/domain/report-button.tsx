'use client'

import { useTranslations } from 'next-intl'
import { useActionState, useState } from 'react'

import { Button, ButtonLink } from '@/components/ui/button'
import { Field, Select, Textarea } from '@/components/ui/field'
import { FormMessage, SubmitButton } from '@/components/ui/form-status'
import { submitReport } from '@/lib/actions/report'
import { IDLE } from '@/lib/types'

const REASONS = ['spam', 'counterfeit', 'misleading', 'offensive', 'wrong_category', 'other'] as const

export function ReportButton({
  productId,
  companyId,
  rfqId,
  signedIn,
}: {
  productId?: string
  companyId?: string
  rfqId?: string
  signedIn: boolean
}) {
  const t = useTranslations('report')
  const [open, setOpen] = useState(false)
  const [state, action] = useActionState(submitReport, IDLE)

  if (!signedIn) {
    return (
      <ButtonLink href="/login" size="sm" variant="quiet">
        {t('action')}
      </ButtonLink>
    )
  }

  if (state.status === 'success') return <FormMessage state={state} />

  if (!open) {
    return (
      <Button type="button" size="sm" variant="quiet" onClick={() => setOpen(true)}>
        {t('action')}
      </Button>
    )
  }

  return (
    <form action={action} className="w-full space-y-2">
      <FormMessage state={state} />
      {productId ? <input type="hidden" name="product_id" value={productId} /> : null}
      {companyId ? <input type="hidden" name="company_id" value={companyId} /> : null}
      {rfqId ? <input type="hidden" name="rfq_id" value={rfqId} /> : null}

      <Field label={t('reason')} htmlFor="reason" required>
        <Select id="reason" name="reason" defaultValue="misleading">
          {REASONS.map((r) => (
            <option key={r} value={r}>{t(r)}</option>
          ))}
        </Select>
      </Field>
      <Field label={t('detail')} htmlFor="detail">
        <Textarea id="detail" name="detail" rows={2} maxLength={1000} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" onClick={() => setOpen(false)}>×</Button>
        <SubmitButton variant="danger">{t('submit')}</SubmitButton>
      </div>
    </form>
  )
}
