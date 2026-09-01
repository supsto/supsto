'use client'

import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { useActionState, useState } from 'react'

import { Field, Input } from '@/components/ui/field'
import { FormMessage, SubmitButton } from '@/components/ui/form-status'
import { signUpWithPassword } from '@/lib/auth/actions'
import { IDLE } from '@/lib/types'
import { cn } from '@/lib/utils'

const ROLES = [
  { value: 'buyer', key: 'Buyer' },
  { value: 'supplier', key: 'Supplier' },
] as const

export function RegisterForm() {
  const t = useTranslations('form')
  const ta = useTranslations('auth')
  const [state, action] = useActionState(signUpWithPassword, IDLE)
  const [role, setRole] = useState<'buyer' | 'supplier'>('buyer')
  const errors = state.status === 'error' ? (state.fieldErrors ?? {}) : {}

  return (
    <form action={action}>
      <FormMessage state={state} />

      <fieldset className="mb-5">
        <legend className="mb-2 text-xs font-semibold text-ink-soft">
          {t('roleQuestion')}
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {ROLES.map((option) => (
            <label
              key={option.value}
              className={cn(
                'cursor-pointer rounded-field border p-3 transition-colors',
                role === option.value
                  ? 'border-brand bg-brand-soft'
                  : 'border-line bg-surface hover:bg-surface-2'
              )}
            >
              <input
                type="radio"
                name="role"
                value={option.value}
                checked={role === option.value}
                onChange={() => setRole(option.value)}
                className="sr-only"
              />
              <span className="block text-[13px] font-bold">{t(`role${option.key}`)}</span>
              <span className="mt-0.5 block text-[11px] text-muted">{t(`role${option.key}Body`)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-4">
        <Field label={t('fullName')} htmlFor="full_name" required error={errors.full_name}>
          <Input
            id="full_name"
            name="full_name"
            autoComplete="name"
            required
            aria-invalid={!!errors.full_name}
          />
        </Field>

        <Field label={t('email')} htmlFor="email" required error={errors.email}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={!!errors.email}
          />
        </Field>

        <Field
          label={t('phone')}
          htmlFor="phone"
          error={errors.phone}
          hint={t('phoneHint')}
        >
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+90 5XX XXX XX XX"
            aria-invalid={!!errors.phone}
          />
        </Field>

        <Field
          label={t('password')}
          htmlFor="password"
          required
          error={errors.password}
          hint={t('passwordHint')}
        >
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            aria-invalid={!!errors.password}
          />
        </Field>

        <Field
          label={t('passwordAgain')}
          htmlFor="password_confirm"
          required
          error={errors.password_confirm}
        >
          <Input
            id="password_confirm"
            name="password_confirm"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={!!errors.password_confirm}
          />
        </Field>
      </div>

      <SubmitButton className="mt-5 w-full" pendingLabel={t('creatingAccount')}>
        {t('createAccount')}
      </SubmitButton>

      <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">
        {ta.rich('terms', {
          terms: (chunks) => (
            <Link href="/terms" className="underline">
              {chunks}
            </Link>
          ),
          privacy: (chunks) => (
            <Link href="/privacy" className="underline">
              {chunks}
            </Link>
          ),
        })}
      </p>

      <p className="mt-4 text-center text-xs text-muted">
        {t('haveAccount')}{' '}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          {t('signInLink')}
        </Link>
      </p>
    </form>
  )
}
