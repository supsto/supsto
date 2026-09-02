'use client'

import { useTranslations } from 'next-intl'
import { useActionState, useState } from 'react'

import { AddressSelect } from '@/components/domain/address-select'
import { BusinessKindPicker } from '@/components/domain/business-kind-picker'
import { KindFields } from '@/components/domain/kind-fields'
import { KINDS, type BusinessKind } from '@/lib/business-kind'
import { ButtonLink } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/field'
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
  const tk = useTranslations('kind')
  const [state, action] = useActionState(createCompany, IDLE)
  const errors = state.status === 'error' ? (state.fieldErrors ?? {}) : {}
  const [kind, setKind] = useState<BusinessKind | ''>('')

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

        {/*
          "Tedarikçi mi alıcı mı" sorusu kullanıcıya soyut geliyordu:
          toptancı ikisidir, üretici de hammadde alır. Bunun yerine
          "ne iş yapıyorsunuz" sorulur ve taraf buradan TÜRETİLİR.
        */}
        <div className="sm:col-span-2">
          <span className="block text-[13px] font-semibold">{tk('question')}</span>
          <p className="mb-2 mt-0.5 text-[11px] text-muted">{tk('lead')}</p>
          <BusinessKindPicker value={kind} onChange={setKind} />
          {errors.company_kind ? (
            <p className="mt-1 text-[11px] font-semibold text-danger">
              {errors.company_kind}
            </p>
          ) : null}
          {/* Taraf, iş tipinin tanımından gelir; kullanıcıya sorulmaz. */}
          <input
            type="hidden"
            name="type"
            value={kind ? mapType(KINDS[kind].role) : 'both'}
          />
        </div>

        <AddressSelect countries={countries} provinces={provinces} />

        {kind ? <KindFields kind={kind} /> : null}

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

/**
 * Hesap rolünü companies.type kısıtına eşler.
 *
 * İkisi ayrı kavram: profiles.role kullanıcının yetkisi,
 * companies.type firmanın pazardaki duruşu. Şimdilik birebir örtüşüyor
 * ama ayrı tutuluyor ki biri değişince diğeri bozulmasın.
 */
function mapType(role: 'buyer' | 'supplier' | 'both') {
  return role
}
