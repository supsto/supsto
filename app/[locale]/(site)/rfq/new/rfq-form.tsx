'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { ButtonLink } from '@/components/ui/button'
import { FormMessage, SubmitButton } from '@/components/ui/form-status'
import { createRfq } from '@/lib/actions/rfq'
import type { LocalizedCategory } from '@/lib/queries/categories'
import { IDLE } from '@/lib/types'

const UNITS = ['adet', 'kg', 'metre', 'litre', 'paket', 'koli', 'rulo', 'set', 'ton']

export function RfqForm({
  categories,
  cities,
}: {
  categories: LocalizedCategory[]
  cities: string[]
}) {
  const t = useTranslations('form')
  const tc = useTranslations('common')
  const [state, action] = useActionState(createRfq, IDLE)
  const errors = state.status === 'error' ? (state.fieldErrors ?? {}) : {}

  return (
    <form action={action}>
      <FormMessage state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t('rfqTitle')}
          htmlFor="title"
          required
          error={errors.title}
          hint={t('rfqTitleHint')}
          className="sm:col-span-2"
        >
          <Input
            id="title"
            name="title"
            required
            maxLength={160}
            placeholder={t('rfqTitlePlaceholder')}
            aria-invalid={!!errors.title}
          />
        </Field>

        <Field label={t('category')} htmlFor="category_id" error={errors.category_id}>
          <Select id="category_id" name="category_id" defaultValue="">
            <option value="">{t('selectCategory')}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t('city')} htmlFor="city" error={errors.city}>
          <Select id="city" name="city" defaultValue="">
            <option value="">{t('selectCity')}</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t('quantity')} htmlFor="quantity" error={errors.quantity}>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            inputMode="numeric"
            placeholder="5000"
            aria-invalid={!!errors.quantity}
          />
        </Field>

        <Field label={t('unit')} htmlFor="unit" error={errors.unit}>
          <Select id="unit" name="unit" defaultValue="adet">
            {UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label={t('targetPrice')}
          htmlFor="target_price"
          error={errors.target_price}
          hint={t('targetPriceHint')}
        >
          <Input
            id="target_price"
            name="target_price"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            placeholder="₺"
            aria-invalid={!!errors.target_price}
          />
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
            placeholder="15"
          />
        </Field>

        <Field
          label={t('deadline')}
          htmlFor="deadline"
          error={errors.deadline}
          className="sm:col-span-2 sm:max-w-64"
        >
          <Input id="deadline" name="deadline" type="date" />
        </Field>

        <Field
          label={t('description')}
          htmlFor="description"
          required
          error={errors.description}
          hint={t('rfqDescHint')}
          className="sm:col-span-2"
        >
          <Textarea
            id="description"
            name="description"
            rows={6}
            required
            maxLength={4000}
            placeholder={t('rfqDescPlaceholder')}
            aria-invalid={!!errors.description}
          />
        </Field>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <ButtonLink href="/rfq">{tc('cancel')}</ButtonLink>
        <SubmitButton pendingLabel={t('publishing')}>{t('publishRfq')}</SubmitButton>
      </div>
    </form>
  )
}
