'use client'

import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState, type FormEvent } from 'react'

import { useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

export function SearchForm({
  className,
  placeholder,
  autoFocusOnMount = false,
  tone = 'light',
}: {
  className?: string
  placeholder?: string
  autoFocusOnMount?: boolean
  /** 'dark' = koyu/fotoğraflı zemin üzerinde duran hâli. */
  tone?: 'light' | 'dark'
}) {
  const t = useTranslations('nav')
  const router = useRouter()
  const params = useSearchParams()
  const [value, setValue] = useState(params.get('q') ?? '')

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = value.trim()
    router.push(
      trimmed ? { pathname: '/search', query: { q: trimmed } } : '/search'
    )
  }

  return (
    <form onSubmit={onSubmit} className={cn('relative', className)} role="search">
      <svg
        viewBox="0 0 20 20"
        className={cn(
          'pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2',
          tone === 'dark' ? 'text-white/70' : 'text-faint'
        )}
        aria-hidden="true"
      >
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          d="M8.5 15a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13Zm4.7-1.8L18 18"
        />
      </svg>
      <input
        type="search"
        name="q"
        value={value}
        autoFocus={autoFocusOnMount}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder ?? t('search')}
        aria-label={t('searchLabel')}
        className={cn(
          'w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm transition-colors',
          'focus:outline-none focus:ring-2',
          tone === 'dark'
            ? 'border-white/25 bg-white/12 text-white backdrop-blur-sm placeholder:text-white/65 focus:border-white/60 focus:ring-white/25'
            : 'border-line bg-surface placeholder:text-faint focus:border-brand focus:ring-brand/20'
        )}
      />
    </form>
  )
}
