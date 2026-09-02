'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { Field, Input, Textarea } from '@/components/ui/field'
import { FormMessage, SubmitButton } from '@/components/ui/form-status'
import { createCapacityOffer } from '@/lib/actions/capacity'
import { IDLE } from '@/lib/types'

/**
 * Kapasite ilanı formu.
 *
 * Alanlar bilinçli olarak az: fabrikacı uzun form doldurmaz. Zorunlu
 * olan yalnızca "ne yapabiliyorum" ve "hangi tarihler arası boşum".
 */
export function CapacityForm({ defaultCity }: { defaultCity: string | null }) {
  const t = useTranslations('capacity')
  const [state, action] = useActionState(createCapacityOffer, IDLE)
  const errors = state.status === 'error' ? (state.fieldErrors ?? {}) : {}

  const today = new Date().toISOString().slice(0, 10)

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <FormMessage state={state} />

      <Field
        label={t('fTitle')}
        htmlFor="title"
        required
        error={errors.title}
        className="sm:col-span-2"
      >
        <Input
          id="title"
          name="title"
          required
          maxLength={160}
          placeholder={t('fTitlePlaceholder')}
        />
      </Field>

      <Field
        label={t('fProcess')}
        htmlFor="process"
        required
        error={errors.process}
        hint={t('fProcessHint')}
        className="sm:col-span-2"
      >
        <Input
          id="process"
          name="process"
          required
          maxLength={120}
          placeholder={t('fProcessPlaceholder')}
        />
      </Field>

      <Field label={t('fFrom')} htmlFor="from" required error={errors.available_from}>
        <Input id="from" name="available_from" type="date" required min={today} />
      </Field>
      <Field label={t('fTo')} htmlFor="to" required error={errors.available_to}>
        <Input id="to" name="available_to" type="date" required min={today} />
      </Field>

      <Field label={t('fMonthly')} htmlFor="monthly" error={errors.monthly_units}>
        <Input id="monthly" name="monthly_units" type="number" min={1} />
      </Field>
      <Field label={t('fUnit')} htmlFor="unit">
        <Input id="unit" name="unit" maxLength={20} placeholder={t('fUnitPlaceholder')} />
      </Field>

      <Field label={t('fMinBatch')} htmlFor="minBatch" error={errors.min_batch}>
        <Input id="minBatch" name="min_batch" type="number" min={1} />
      </Field>
      <Field label={t('fCity')} htmlFor="city">
        <Input id="city" name="city" maxLength={60} defaultValue={defaultCity ?? ''} />
      </Field>

      <Field label={t('fDescription')} htmlFor="desc" className="sm:col-span-2">
        <Textarea
          id="desc"
          name="description"
          rows={3}
          maxLength={1500}
          placeholder={t('fDescriptionPlaceholder')}
        />
      </Field>

      <div className="sm:col-span-2">
        <SubmitButton>{t('publish')}</SubmitButton>
      </div>
    </form>
  )
}
