'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/field'
import { FormMessage, SubmitButton } from '@/components/ui/form-status'
import { Notice } from '@/components/ui/notice'
import { requestVerification } from '@/lib/actions/profile'
import { IDLE } from '@/lib/types'
import { useState } from 'react'

/**
 * Saha doğrulaması talebi.
 *
 * Vergi numarası girilmeden talep açılmasına izin verilmez — ekibin
 * inceleyecek bir şeyi olmadan kuyruğa girmesi ikisinin de vaktini alır.
 */
export function VerificationRequest({
  companyId,
  verified,
  status,
  hasTaxNumber,
}: {
  companyId: string
  verified: boolean
  status: string | null
  hasTaxNumber: boolean
}) {
  const t = useTranslations('profile')
  const [open, setOpen] = useState(false)
  const [state, action] = useActionState(requestVerification, IDLE)

  if (verified) {
    return <Notice tone="success">{t('verificationApproved')}</Notice>
  }
  if (status === 'pending' || state.status === 'success') {
    return <Notice tone="brand">{t('verificationPending')}</Notice>
  }

  return (
    <div>
      {status === 'rejected' ? (
        <Notice tone="danger" className="mb-2">{t('verificationRejected')}</Notice>
      ) : null}

      {!hasTaxNumber ? (
        <Notice tone="warning">{t('verificationHint')}</Notice>
      ) : open ? (
        <form action={action} className="space-y-2">
          <FormMessage state={state} />
          <input type="hidden" name="company_id" value={companyId} />
          <Textarea
            name="note"
            rows={3}
            maxLength={1000}
            placeholder={t('verificationNote')}
            aria-label={t('verificationNote')}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" onClick={() => setOpen(false)}>×</Button>
            <SubmitButton>{t('requestVerification')}</SubmitButton>
          </div>
        </form>
      ) : (
        <>
          <Badge tone="neutral">{t('stepVerification')}</Badge>
          <Button
            type="button"
            variant="primary"
            className="mt-2 w-full"
            onClick={() => setOpen(true)}
          >
            {t('requestVerification')}
          </Button>
        </>
      )}
    </div>
  )
}
