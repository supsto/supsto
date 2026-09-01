'use client'

import { useTranslations } from 'next-intl'
import { useEffect } from 'react'

import { Button, ButtonLink } from '@/components/ui/button'
import { Logo } from '@/components/layout/logo'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('error')

  useEffect(() => {
    // Üretimde burası hata izleme servisine bağlanır.
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <Logo className="mb-8" />
      <p className="text-[70px] font-black leading-none text-line-strong">500</p>
      <h1 className="mt-3 text-2xl font-extrabold">{t('serverTitle')}</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        {t('serverBody')}
      </p>
      {error.digest ? (
        <code className="mt-3 rounded bg-surface-2 px-2 py-1 text-[11px] text-muted">
          {t('errorCode')}: {error.digest}
        </code>
      ) : null}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <ButtonLink href="/">{t('home')}</ButtonLink>
        <Button variant="primary" onClick={reset}>
          {t('retry')}
        </Button>
      </div>
    </div>
  )
}
