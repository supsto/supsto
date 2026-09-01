'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { PasswordInput } from '@/components/ui/password-input'
import { Field, Input } from '@/components/ui/field'
import { FormMessage, SubmitButton } from '@/components/ui/form-status'
import { Link } from '@/i18n/navigation'
import { signInWithPassword } from '@/lib/auth/actions'
import { IDLE } from '@/lib/types'

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations('form')
  const [state, action] = useActionState(signInWithPassword, IDLE)
  const errors = state.status === 'error' ? (state.fieldErrors ?? {}) : {}

  return (
    <form action={action}>
      <FormMessage state={state} />
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div className="space-y-4">
        <Field label={t('email')} htmlFor="email" required error={errors.email}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            autoFocus
            placeholder="ornek@firma.com"
            aria-invalid={!!errors.email}
          />
        </Field>

        <Field label={t('password')} htmlFor="password" required error={errors.password}>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
            aria-invalid={!!errors.password}
          />
        </Field>
      </div>

      <SubmitButton className="mt-6 w-full" pendingLabel={t('signingIn')}>
        {t('signIn')}
      </SubmitButton>

      <p className="mt-5 text-center text-[13px] text-muted">
        {t('noAccount')}{' '}
        <Link href="/register" className="font-semibold text-brand hover:underline">
          {t('signUp')}
        </Link>
      </p>
    </form>
  )
}
