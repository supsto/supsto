import type { ReactNode } from 'react'

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="px-5 py-14 text-center">
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      {description ? (
        <p className="text-muted text-sm mt-2 max-w-md mx-auto">{description}</p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center gap-2">{action}</div> : null}
    </div>
  )
}
