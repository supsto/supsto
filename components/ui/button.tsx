import type { ComponentProps } from 'react'

import { Link } from '@/i18n/navigation'

import { cn } from '@/lib/utils'

type Variant =
  | 'primary' | 'default' | 'ghost' | 'success' | 'danger' | 'quiet' | 'onDark'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand text-white border-brand hover:bg-brand-dark disabled:hover:bg-brand',
  default:
    'bg-surface text-ink border-line hover:bg-surface-2 disabled:hover:bg-surface',
  ghost:
    'bg-surface-2 text-ink border-line hover:bg-line/60 disabled:hover:bg-surface-2',
  success:
    'bg-success text-white border-success hover:brightness-95 disabled:hover:brightness-100',
  danger:
    'bg-surface text-danger border-danger/40 hover:bg-danger-soft disabled:hover:bg-surface',
  quiet:
    'bg-transparent text-muted border-transparent hover:text-ink hover:bg-surface-2',
  // Koyu/fotoğraflı zemin üzerinde duran header butonları
  onDark:
    'bg-white/12 text-white border-white/30 backdrop-blur-sm hover:bg-white/22',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-xs gap-1.5',
  md: 'h-10 px-3.5 text-[13px] gap-2',
  lg: 'h-12 px-5 text-sm gap-2',
}

const BASE =
  'inline-flex items-center justify-center rounded-field border font-semibold ' +
  'transition-colors cursor-pointer select-none whitespace-nowrap ' +
  'disabled:cursor-not-allowed disabled:opacity-55'

interface StyleProps {
  variant?: Variant
  size?: Size
}

export function buttonClass({ variant = 'default', size = 'md' }: StyleProps = {}) {
  return cn(BASE, VARIANTS[variant], SIZES[size])
}

export function Button({
  variant,
  size,
  className,
  ...props
}: ComponentProps<'button'> & StyleProps) {
  return <button className={cn(buttonClass({ variant, size }), className)} {...props} />
}

/**
 * i18n `Link`'i sarmalar: href olarak kanonik yolu verirsiniz
 * (`/contact` ya da `{ pathname: '/product/[slug]', params }`),
 * aktif dile göre `/tr/iletisim` üretilir.
 */
export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & StyleProps) {
  return <Link className={cn(buttonClass({ variant, size }), className)} {...props} />
}
