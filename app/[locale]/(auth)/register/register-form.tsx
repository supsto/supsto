'use client'

import { useTranslations } from 'next-intl'
import { useActionState, useState } from 'react'

import { Field, Input } from '@/components/ui/field'
import { FormMessage, SubmitButton } from '@/components/ui/form-status'
import { Notice } from '@/components/ui/notice'
import { PasswordInput } from '@/components/ui/password-input'
import { Link } from '@/i18n/navigation'
import { ACCOUNT_TYPES, type AccountType } from '@/lib/account'
import { signUpWithPassword } from '@/lib/auth/actions'
import { IDLE } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Hesap tipi → çeviri anahtarı. */
const LABEL: Record<AccountType, { title: 'retailer' | 'wholesaler' | 'bothType'; body: 'retailerBody' | 'wholesalerBody' | 'bothTypeBody' }> = {
  buyer: { title: 'retailer', body: 'retailerBody' },
  supplier: { title: 'wholesaler', body: 'wholesalerBody' },
  both: { title: 'bothType', body: 'bothTypeBody' },
}

const ICON: Record<AccountType, string> = {
  buyer: 'M3 5h14l-1.5 8.5a2 2 0 0 1-2 1.6H6.5a2 2 0 0 1-2-1.6L3 5Zm3.5 12.5a1 1 0 1 0 0 .1m7-.1a1 1 0 1 0 0 .1M1.5 2.5h1.8l.4 2.5',
  supplier: 'M2.5 7.5 10 3.5l7.5 4v7l-7.5 4-7.5-4v-7Zm0 0L10 11.5m0 0 7.5-4M10 11.5v7',
  both: 'M3 6h6v8H3V6Zm8 0h6v8h-6V6Z',
}

/**
 * Kayıt formu bilerek kısa: hesap tipi, ad, e-posta, şifre.
 *
 * Firma bilgisi, telefon ve belge doğrulaması kayıttan sonra profil
 * sayfasına bırakıldı — uzun kayıt formu B2B'de en büyük terk sebebi.
 */
export function RegisterForm() {
  const t = useTranslations('form')
  const ta = useTranslations('auth')
  const [state, action] = useActionState(signUpWithPassword, IDLE)
  const [role, setRole] = useState<AccountType>('buyer')
  const errors = state.status === 'error' ? (state.fieldErrors ?? {}) : {}

  return (
    <form action={action}>
      <FormMessage state={state} />

      <fieldset className="mb-6">
        <legend className="mb-2.5 text-xs font-semibold text-ink-soft">
          {ta('accountTypeQuestion')}
        </legend>
        <div className="grid gap-2">
          {ACCOUNT_TYPES.map((option) => {
            const active = role === option
            return (
              <label
                key={option}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-field border p-3 transition-colors',
                  active
                    ? 'border-brand bg-brand-soft ring-1 ring-brand/20'
                    : 'border-line bg-surface hover:bg-surface-2'
                )}
              >
                <input
                  type="radio"
                  name="role"
                  value={option}
                  checked={active}
                  onChange={() => setRole(option)}
                  className="sr-only"
                />
                <span
                  className={cn(
                    'grid size-9 shrink-0 place-items-center rounded-[10px]',
                    active ? 'bg-brand text-white' : 'bg-surface-2 text-muted'
                  )}
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d={ICON[option]} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold">{ta(LABEL[option].title)}</span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
                    {ta(LABEL[option].body)}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
        <p className="mt-2 text-[11px] text-faint">{ta('changeLater')}</p>
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
            placeholder="ornek@firma.com"
            aria-invalid={!!errors.email}
          />
        </Field>

        <Field
          label={t('password')}
          htmlFor="password"
          required
          error={errors.password}
          hint={t('passwordHint')}
        >
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            aria-invalid={!!errors.password}
          />
        </Field>
      </div>

      <SubmitButton className="mt-6 w-full" pendingLabel={t('creatingAccount')}>
        {t('createAccount')}
      </SubmitButton>

      <Notice tone="neutral" className="mt-4">
        {ta('restLater')}
      </Notice>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-muted">
        {ta.rich('terms', {
          terms: (chunks) => (
            <Link href="/terms" className="underline">{chunks}</Link>
          ),
          privacy: (chunks) => (
            <Link href="/privacy" className="underline">{chunks}</Link>
          ),
        })}
      </p>

      <p className="mt-4 text-center text-[13px] text-muted">
        {t('haveAccount')}{' '}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          {t('signInLink')}
        </Link>
      </p>
    </form>
  )
}
