import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'bg-surface border border-line rounded-card shadow-card',
        className
      )}
      {...props}
    />
  )
}

export function CardHead({
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
    <div
      className={cn(
        'flex items-start justify-between gap-4 px-[18px] py-4 border-b border-line',
        className
      )}
    >
      <div className="min-w-0">
        <div className="font-bold text-[15px] leading-tight">{title}</div>
        {subtitle ? (
          <div className="text-muted text-xs mt-1">{subtitle}</div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function CardBody({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('p-[18px]', className)} {...props} />
}
