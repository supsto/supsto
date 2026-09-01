'use client'

import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import type { ActionState } from '@/lib/types'

/** Form gönderilirken kendini devre dışı bırakan gönder butonu. */
export function SubmitButton({
  children,
  pendingLabel = 'Gönderiliyor…',
  className,
  variant = 'primary',
}: {
  children: React.ReactNode
  pendingLabel?: string
  className?: string
  variant?: 'primary' | 'default' | 'success' | 'danger'
}) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant={variant} disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </Button>
  )
}

/** Server Action'ın döndürdüğü genel hata/başarı mesajı. */
export function FormMessage({ state }: { state: ActionState }) {
  if (state.status === 'idle') return null

  return (
    <Notice tone={state.status === 'error' ? 'danger' : 'success'} className="mb-4">
      {state.status === 'error' ? state.message : (state.message ?? 'İşlem tamamlandı.')}
    </Notice>
  )
}
