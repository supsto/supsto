import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/lib/utils'

const CONTROL =
  'w-full rounded-field border border-line bg-surface px-3 py-2.5 text-sm ' +
  'placeholder:text-faint transition-colors ' +
  'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 ' +
  'disabled:bg-surface-2 disabled:text-muted aria-invalid:border-danger'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(CONTROL, className)} {...props} />
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(CONTROL, 'resize-y', className)} {...props} />
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(CONTROL, 'appearance-none pr-8 bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2012%2012%27%3E%3Cpath%20fill%3D%27%23687386%27%20d%3D%27M6%208.5%201.5%204h9z%27%2F%3E%3C%2Fsvg%3E")] bg-[length:12px] bg-[right_12px_center] bg-no-repeat', className)} {...props} />
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: ReactNode
  htmlFor?: string
  hint?: ReactNode
  error?: ReactNode
  required?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-xs font-semibold text-ink-soft">
        {label}
        {required ? <span className="text-danger ml-0.5">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  )
}
