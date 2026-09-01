'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useTransition } from 'react'

import { Input, Select } from '@/components/ui/field'
import { cn } from '@/lib/utils'

export interface FilterOption {
  value: string
  label: string
}

export interface FilterDef {
  name: string
  placeholder: string
  options?: FilterOption[]
  type?: 'text' | 'select'
}

/**
 * Filtreleri URL'e yazar; böylece durum paylaşılabilir, geri tuşu çalışır ve
 * sayfa sunucuda yeniden render edilir.
 */
export function FilterBar({
  filters,
  className,
}: {
  filters: FilterDef[]
  className?: string
}) {
  const t = useTranslations('common')
  const router = useRouter()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  function update(name: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(name, value)
    else next.delete(name)
    next.delete('sayfa') // filtre değişince ilk sayfaya dön
    // Yalnızca sorgu dizesi değişir; göreli push mevcut yolu ve dili korur.
    startTransition(() => {
      router.push(`?${next}`)
    })
  }

  const hasAny = filters.some((f) => params.get(f.name))

  return (
    <div
      className={cn(
        'mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-3.5',
        pending && 'opacity-60',
        className
      )}
    >
      {filters.map((filter) =>
        filter.type === 'text' ? (
          <Input
            key={filter.name}
            defaultValue={params.get(filter.name) ?? ''}
            placeholder={filter.placeholder}
            aria-label={filter.placeholder}
            className="w-full sm:max-w-64"
            onKeyDown={(e) => {
              if (e.key === 'Enter') update(filter.name, e.currentTarget.value)
            }}
            onBlur={(e) => {
              if (e.currentTarget.value !== (params.get(filter.name) ?? '')) {
                update(filter.name, e.currentTarget.value)
              }
            }}
          />
        ) : (
          <Select
            key={filter.name}
            value={params.get(filter.name) ?? ''}
            aria-label={filter.placeholder}
            className="w-full sm:w-auto sm:min-w-40"
            onChange={(e) => update(filter.name, e.target.value)}
          >
            <option value="">{filter.placeholder}</option>
            {filter.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        )
      )}

      {hasAny ? (
        <button
          type="button"
          onClick={() => startTransition(() => router.push('?'))}
          className="ml-auto text-xs font-semibold text-muted underline-offset-2 hover:text-danger hover:underline"
        >
          {t('clearFilters')}
        </button>
      ) : null}
    </div>
  )
}
