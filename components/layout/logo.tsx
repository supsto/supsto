import { Link } from '@/i18n/navigation'

import { cn } from '@/lib/utils'

export function Logo({
  className,
  tone = 'dark',
}: {
  className?: string
  tone?: 'dark' | 'light'
}) {
  return (
    <Link
      href="/"
      className={cn('inline-flex items-center gap-2.5 shrink-0', className)}
    >
      <span
        className="grid size-9 place-items-center rounded-[10px] bg-linear-to-br from-[#62a0ff] to-brand text-white font-extrabold"
        aria-hidden="true"
      >
        S
      </span>
      <span
        className={cn(
          'text-xl font-extrabold tracking-tight',
          tone === 'light' ? 'text-white' : 'text-ink'
        )}
      >
        Sup<span className="text-brand">sto</span>
      </span>
    </Link>
  )
}
