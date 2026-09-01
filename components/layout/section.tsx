import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/** Sayfa içeriğini ortalayan tek kap — her sayfada aynı genişlik ve boşluk. */
export function Container({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('mx-auto w-full max-w-[1400px] px-4 md:px-6', className)}>
      {children}
    </div>
  )
}

export function SectionHead({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-3 flex items-end justify-between gap-4', className)}>
      <div>
        <h2 className="text-base font-bold">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

/** Sayfa başlığı + açıklama; iç sayfaların standart girişi. */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold md:text-[28px]">{title}</h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
