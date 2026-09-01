import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function Stat({
  label,
  value,
  hint,
  className,
}: {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'bg-surface border border-line rounded-card shadow-card p-4',
        className
      )}
    >
      <div className="text-xs text-muted">{label}</div>
      <div className="text-2xl font-extrabold mt-1.5 tabular-nums">{value}</div>
      {hint ? <div className="text-[11px] text-success mt-1">{hint}</div> : null}
    </div>
  )
}
