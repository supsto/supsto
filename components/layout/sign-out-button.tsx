'use client'

import { useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { signOut } from '@/lib/auth/actions'

export function SignOutButton() {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      size="sm"
      variant="quiet"
      disabled={pending}
      onClick={() => startTransition(() => void signOut())}
    >
      {pending ? 'Çıkılıyor…' : 'Çıkış yap'}
    </Button>
  )
}
