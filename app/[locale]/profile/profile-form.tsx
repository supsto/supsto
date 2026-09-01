'use client'

import { useTranslations } from 'next-intl'
import { useActionState, useState } from 'react'

import { Card, CardBody, CardHead } from '@/components/ui/card'
import { Field, Input, Select } from '@/components/ui/field'
import { FormMessage, SubmitButton } from '@/components/ui/form-status'
import { ACCOUNT_TYPES, type AccountType } from '@/lib/account'
import { updateProfile } from '@/lib/actions/profile'
import { IDLE, type Profile } from '@/lib/types'

const TYPE_LABEL: Record<AccountType, 'retailer' | 'wholesaler' | 'bothType'> = {
  buyer: 'retailer',
  supplier: 'wholesaler',
  both: 'bothType',
}

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const t = useTranslations('profile')
  const tf = useTranslations('form')
  const ta = useTranslations('auth')
  const [state, action] = useActionState(updateProfile, IDLE)
  const [role, setRole] = useState<AccountType>(
    (profile?.role as AccountType) ?? 'buyer'
  )
  const errors = state.status === 'error' ? (state.fieldErrors ?? {}) : {}

  return (
    <Card>
      <CardHead title={t('personalInfo')} />
      <CardBody className="pt-0">
        <form action={action} className="grid gap-4 sm:grid-cols-2">
          <FormMessage state={state} />

          <Field label={tf('fullName')} htmlFor="full_name" required error={errors.full_name}>
            <Input
              id="full_name"
              name="full_name"
              required
              maxLength={120}
              defaultValue={profile?.full_name ?? ''}
              aria-invalid={!!errors.full_name}
            />
          </Field>

          <Field label={t('jobTitle')} htmlFor="job_title">
            <Input
              id="job_title"
              name="job_title"
              maxLength={80}
              placeholder={t('jobTitlePlaceholder')}
              defaultValue={profile?.job_title ?? ''}
            />
          </Field>

          <Field label={tf('phone')} htmlFor="phone" error={errors.phone}>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+90 5XX XXX XX XX"
              defaultValue={profile?.phone ?? ''}
              aria-invalid={!!errors.phone}
            />
          </Field>

          <Field label={t('accountType')} htmlFor="role" hint={t('accountTypeHint')}>
            <Select
              id="role"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value as AccountType)}
            >
              {ACCOUNT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ta(TYPE_LABEL[type])}
                </option>
              ))}
            </Select>
          </Field>

          {/* Yalnızca hem alıp hem satanlar için: hangi panel açılsın? */}
          {role === 'both' ? (
            <Field
              label={t('panelPreference')}
              htmlFor="preferred_panel"
              hint={t('panelPreferenceHint')}
              className="sm:col-span-2 sm:max-w-64"
            >
              <Select
                id="preferred_panel"
                name="preferred_panel"
                defaultValue={profile?.preferred_panel ?? 'supplier'}
              >
                <option value="supplier">{t('sellerPanel')}</option>
                <option value="buyer">{t('buyerPanel')}</option>
              </Select>
            </Field>
          ) : null}

          <div className="sm:col-span-2">
            <SubmitButton pendingLabel={tf('saving')}>{t('save')}</SubmitButton>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
