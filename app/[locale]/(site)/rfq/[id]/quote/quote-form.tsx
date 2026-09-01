'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { ButtonLink } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { FormMessage, SubmitButton } from '@/components/ui/form-status'
import { submitQuote } from '@/lib/actions/quote'
import { IDLE, type Company } from '@/lib/types'

export function QuoteForm({
  rfqId,
  companies,
}: {
  rfqId: string
  companies: Company[]
}) {
  const t = useTranslations('form')
  const tc = useTranslations('common')
  const [state, action] = useActionState(submitQuote, IDLE)
  const errors = state.status === 'error' ? (state.fieldErrors ?? {}) : {}

  return (
    <form action={action}>
      <FormMessage state={state} />
      <input type="hidden" name="rfq_id" value={rfqId} />

      <div className="grid gap-4 sm:grid-cols-2">
        {companies.length > 1 ? (
          <Field
            label={t('quotingCompany')}
            htmlFor="company_id"
            required
            error={errors.company_id}
            className="sm:col-span-2"
          >
            <Select id="company_id" name="company_id" required>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <input type="hidden" name="company_id" value={companies[0]?.id ?? ''} />
        )}

        <Field
          label={t('quoteUnitPrice')}
          htmlFor="price"
          required
          error={errors.price}
        >
          <Input
            id="price"
            name="price"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            required
            placeholder="44.00"
            aria-invalid={!!errors.price}
          />
        </Field>

        <Field label="MOQ" htmlFor="moq" error={errors.moq} hint={t('moqHint')}>
          <Input id="moq" name="moq" type="number" min={1} inputMode="numeric" placeholder="1000" />
        </Field>

        <Field
          label={t('leadTimeDays')}
          htmlFor="delivery_days"
          error={errors.delivery_days}
        >
          <Input
            id="delivery_days"
            name="delivery_days"
            type="number"
            min={1}
            max={365}
            inputMode="numeric"
            placeholder="7"
          />
        </Field>

        <Field
          label={t('validUntil')}
          htmlFor="valid_until"
          error={errors.valid_until}
        >
          <Input id="valid_until" name="valid_until" type="date" />
        </Field>

        <Field
          label={t('note')}
          htmlFor="message"
          error={errors.message}
          hint={t('quoteNoteHint')}
          className="sm:col-span-2"
        >
          <Textarea
            id="message"
            name="message"
            rows={5}
            maxLength={2000}
            placeholder={t('quoteNotePlaceholder')}
          />
        </Field>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <ButtonLink href={{ pathname: '/rfq/[id]', params: { id: rfqId } }}>{tc('cancel')}</ButtonLink>
        <SubmitButton pendingLabel={t('sending')}>{t('sendQuote')}</SubmitButton>
      </div>
    </form>
  )
}
