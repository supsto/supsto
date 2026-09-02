'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { SubmitButton } from '@/components/ui/form-status'
import { setCapacityStatus } from '@/lib/actions/capacity'
import { IDLE } from '@/lib/types'

/**
 * İlan durumunu değiştirir.
 *
 * "Rezerve" ara durumu bilerek var: fabrikacı bir alıcıyla konuşurken
 * ilanı kapatmak istemiyor ama yeni teklif de almak istemiyor.
 */
export function CapacityStatus({
  id,
  status,
}: {
  id: string
  status: string
}) {
  const t = useTranslations('capacity')
  const [state, action] = useActionState(setCapacityStatus, IDLE)

  const next =
    status === 'open' ? 'reserved' : status === 'reserved' ? 'closed' : 'open'

  return (
    <form action={action} className="shrink-0">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={next} />
      <SubmitButton variant="default">{t(`moveTo_${next}`)}</SubmitButton>
      {state.status === 'error' ? (
        <p className="mt-1 text-[11px] text-danger">{state.message}</p>
      ) : null}
    </form>
  )
}
