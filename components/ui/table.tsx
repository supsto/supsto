import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

/** Tablolar dar ekranda sayfayı değil kendi kabını kaydırmalı. */
export function TableWrap({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('overflow-x-auto', className)} {...props} />
}

export function Table({ className, ...props }: ComponentProps<'table'>) {
  return <table className={cn('w-full border-collapse', className)} {...props} />
}

export function Th({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      className={cn(
        'bg-surface-2 text-muted text-[11px] font-semibold uppercase tracking-wide',
        'text-left px-3 py-3 border-b border-line whitespace-nowrap',
        className
      )}
      {...props}
    />
  )
}

export function Td({ className, ...props }: ComponentProps<'td'>) {
  return (
    <td
      className={cn('px-3 py-3 border-b border-line text-[13px] align-middle', className)}
      {...props}
    />
  )
}
