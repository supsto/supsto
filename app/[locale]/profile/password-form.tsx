'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { Card, CardBody, CardHead } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { FormMessage, SubmitButton } from '@/components/ui/form-status'
import { PasswordInput } from '@/components/ui/password-input'
import { changePassword } from '@/lib/actions/profile'
import { IDLE } from '@/lib/types'

export function PasswordForm() {
  const t = useTranslations('profile')
  const tf = useTranslations('form')
  const [state, action] = useActionState(changePassword, IDLE)
  const errors = state.status === 'error' ? (state.fieldErrors ?? {}) : {}

  return (
    <Card>
      <CardHead title={t('security')} />
      <CardBody className="pt-0">
        <form action={action} className="flex flex-wrap items-end gap-3">
          <FormMessage state={state} />
          <Field
            label={t('newPassword')}
            htmlFor="new_password"
            required
            error={errors.password}
            hint={tf('passwordHint')}
            className="min-w-56 flex-1"
          >
            <PasswordInput
              id="new_password"
              name="password"
              autoComplete="new-password"
              required
              minLength={8}
              aria-invalid={!!errors.password}
            />
          </Field>
          <SubmitButton pendingLabel={tf('saving')}>{t('changePassword')}</SubmitButton>
        </form>
      </CardBody>
    </Card>
  )
}
