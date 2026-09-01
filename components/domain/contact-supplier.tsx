'use client'

import { useTranslations } from 'next-intl'
import { useActionState, useState } from 'react'

import { Button, ButtonLink } from '@/components/ui/button'
import { Textarea } from '@/components/ui/field'
import { FormMessage, SubmitButton } from '@/components/ui/form-status'
import { startConversation } from '@/lib/actions/message'
import { IDLE } from '@/lib/types'

/**
 * Ürün/tedarikçi sayfasından görüşme başlatır. Oturumsuz kullanıcıya
 * form yerine giriş bağlantısı gösterilir — boş formu doldurup sonra
 * kaybetmesin.
 */
export function ContactSupplier({
  companyId,
  productId,
  signedIn,
}: {
  companyId: string
  productId?: string
  signedIn: boolean
}) {
  const t = useTranslations('messages')
  const [open, setOpen] = useState(false)
  const [state, action] = useActionState(startConversation, IDLE)

  if (!signedIn) {
    return (
      <ButtonLink href="/login" variant="primary">
        {t('contactSupplier')}
      </ButtonLink>
    )
  }

  if (!open) {
    return (
      <Button type="button" variant="primary" onClick={() => setOpen(true)}>
        {t('contactSupplier')}
      </Button>
    )
  }

  return (
    <form action={action} className="w-full">
      <FormMessage state={state} />
      <input type="hidden" name="company_id" value={companyId} />
      {productId ? <input type="hidden" name="product_id" value={productId} /> : null}
      <Textarea
        name="body"
        rows={4}
        required
        maxLength={4000}
        autoFocus
        placeholder={t('messagePlaceholder')}
        aria-label={t('startChat')}
      />
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" onClick={() => setOpen(false)}>
          ×
        </Button>
        <SubmitButton pendingLabel={t('sending')}>{t('startChat')}</SubmitButton>
      </div>
    </form>
  )
}
