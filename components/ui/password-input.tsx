'use client'

import { useTranslations } from 'next-intl'
import { useState, type ComponentProps } from 'react'

import { Input } from '@/components/ui/field'
import { cn } from '@/lib/utils'

/**
 * Göster/gizle düğmeli şifre alanı.
 *
 * Bunun olması "şifre tekrar" alanını gereksiz kılar: kullanıcı ne
 * yazdığını görebiliyorsa iki kez yazdırmaya gerek yok. Kayıt formunu
 * bir alan kısaltır.
 */
export function PasswordInput({ className, ...props }: ComponentProps<typeof Input>) {
  const t = useTranslations('auth')
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        className={cn('pr-11', className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t('hidePassword') : t('showPassword')}
        title={visible ? t('hidePassword') : t('showPassword')}
        className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-field text-muted transition-colors hover:text-ink"
      >
        <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6">
          {visible ? (
            <>
              <path d="M2.5 10S5 4.5 10 4.5 17.5 10 17.5 10 15 15.5 10 15.5 2.5 10 2.5 10Z" />
              <circle cx="10" cy="10" r="2.5" />
              <path d="m3 3 14 14" strokeLinecap="round" />
            </>
          ) : (
            <>
              <path d="M2.5 10S5 4.5 10 4.5 17.5 10 17.5 10 15 15.5 10 15.5 2.5 10 2.5 10Z" />
              <circle cx="10" cy="10" r="2.5" />
            </>
          )}
        </svg>
      </button>
    </div>
  )
}
