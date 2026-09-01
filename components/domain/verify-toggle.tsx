'use client'

import { useTranslations } from 'next-intl'
import { useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { setCompanyVerified } from '@/lib/actions/admin'

/** Saha doğrulama rozetini açıp kapatır. Yalnızca admin görebilir. */
export function VerifyToggle({
  companyId,
  verified,
}: {
  companyId: string
  verified: boolean
}) {
  const t = useTranslations('admin')
  const [pending, startTransition] = useTransition()

  return (
    <form
      action={(formData) => startTransition(() => void setCompanyVerified(formData))}
    >
      <input type="hidden" name="company_id" value={companyId} />
      <input type="hidden" name="verified" value={String(!verified)} />
      <Button
        type="submit"
        size="sm"
        variant={verified ? 'danger' : 'success'}
        disabled={pending}
      >
        {verified ? t('revoke') : t('approve')}
      </Button>
    </form>
  )
}
