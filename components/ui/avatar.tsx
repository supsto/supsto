import Image from 'next/image'

import { cn } from '@/lib/utils'

const SIZES = {
  sm: 'size-9 text-xs rounded-[10px]',
  md: 'size-12 text-sm rounded-xl',
  lg: 'size-[74px] text-xl rounded-2xl',
} as const

/** Firma logosu; logo yoksa baş harflerle nötr bir yer tutucu. */
export function CompanyAvatar({
  name,
  logoUrl,
  size = 'md',
  className,
}: {
  name: string
  logoUrl?: string | null
  size?: keyof typeof SIZES
  className?: string
}) {
  const initials = name
    .split(/\s+/)
    .filter((w) => /[a-zA-ZçğıöşüÇĞİÖŞÜ0-9]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]?.toLocaleUpperCase('tr-TR'))
    .join('')

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden grid place-items-center font-extrabold',
        'bg-brand-soft text-brand border border-line',
        SIZES[size],
        className
      )}
    >
      {logoUrl ? (
        <Image src={logoUrl} alt="" fill sizes="96px" className="object-cover" />
      ) : (
        <span aria-hidden="true">{initials || '—'}</span>
      )}
    </div>
  )
}
