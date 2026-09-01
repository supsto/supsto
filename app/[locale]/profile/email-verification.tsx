'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form-status'
import { resendVerificationEmail } from '@/lib/actions/profile'
import { IDLE, type ActionState } from '@/lib/types'

export function EmailVerification({
  verified,
  email,
}: {
  verified: boolean
  email: string
}) {
  const t = useTranslations('profile')
  const [state, action, pending] = useActionState<ActionState>(
    async () => resendVerificationEmail(),
    IDLE
  )

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[13px]" title={email}>
          {email}
        </span>
        {verified ? (
          <Badge tone="success">{t('emailVerified')}</Badge>
        ) : (
          <Badge tone="warning">{t('emailNotVerified')}</Badge>
        )}
      </div>

      {!verified ? (
        <form action={action} className="mt-2">
          <FormMessage state={state} />
          <Button type="submit" size="sm" disabled={pending} className="w-full">
            {t('resendEmail')}
          </Button>
        </form>
      ) : null}
    </div>
  )
}
