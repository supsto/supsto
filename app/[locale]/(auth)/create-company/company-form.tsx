'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { AddressSelect } from '@/components/domain/address-select'
import { ButtonLink } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import type { CountryOption, RegionOption } from '@/lib/queries/geo'
import { FormMessage, SubmitButton } from '@/components/ui/form-status'
import { createCompany } from '@/lib/actions/company'
import { IDLE } from '@/lib/types'

export function CompanyForm({
  countries,
  provinces,
}: {
  countries: CountryOption[]
  provinces: RegionOption[]
}) {
  const t = useTranslations('form')
  const [state, action] = useActionState(createCompany, IDLE)
  const errors = state.status === 'error' ? (state.fieldErrors ?? {}) : {}

  return (
    <form action={action}>
      <FormMessage state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t('companyName')}
          htmlFor="name"
          required
          error={errors.name}
          className="sm:col-span-2"
        >
          <Input
            id="name"
            name="name"
            required
            maxLength={200}
            placeholder="NOVA KUTU Ambalaj San. Tic. Ltd. Şti."
            aria-invalid={!!errors.name}
          />
        </Field>

        <Field label={t('companyType')} htmlFor="type" required error={errors.type}>
          <Select id="type" name="type" defaultValue="supplier">
            <option value="supplier">{t('typeSupplier')}</option>
            <option value="buyer">{t('typeBuyer')}</option>
            <option value="both">{t('typeBoth')}</option>
          </Select>
        </Field>

        <AddressSelect countries={countries} provinces={provinces} />

        <Field label={t('phone')} htmlFor="phone" error={errors.phone}>
          <Input id="phone" name="phone" type="tel" placeholder="+90 212 123 45 67" />
        </Field>

        <Field label={t('whatsapp')} htmlFor="whatsapp" error={errors.whatsapp}>
          <Input id="whatsapp" name="whatsapp" type="tel" placeholder="+90 5XX XXX XX XX" />
        </Field>

        <Field label={t('website')} htmlFor="website" error={errors.website}>
          <Input
            id="website"
            name="website"
            type="url"
            placeholder="https://firmaniz.com"
            aria-invalid={!!errors.website}
          />
        </Field>

        <Field
          label={t('companyAbout')}
          htmlFor="description"
          error={errors.description}
          hint={t('companyAboutHint')}
          className="sm:col-span-2"
        >
          <Textarea id="description" name="description" rows={4} maxLength={2000} />
        </Field>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <ButtonLink href="/dashboard">{t('later')}</ButtonLink>
        <SubmitButton pendingLabel={t('creating')}>{t('createCompany')}</SubmitButton>
      </div>
    </form>
  )
}
