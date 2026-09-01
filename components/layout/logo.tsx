import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { LogoMark } from './logo-mark'

/**
 * Marka kilidi: amblem + kelime işareti.
 *
 * Kelime işareti geniş harf aralıklı ve büyük harflidir — kurumsal
 * ciddiyet ve güven hissi için. Amblemdeki S ile kelimedeki S aynı
 * yeşili paylaşır, ikisi tek bir kimlik olarak okunur.
 */
export function Logo({
  className,
  tone = 'dark',
  showWordmark = true,
}: {
  className?: string
  /** 'light' = koyu zemin üzerinde. */
  tone?: 'dark' | 'light'
  showWordmark?: boolean
}) {
  return (
    <Link
      href="/"
      className={cn('inline-flex items-center gap-2.5 shrink-0', className)}
      aria-label="Supsto"
    >
      <LogoMark className={tone === 'light' ? 'text-white' : 'text-primary'} />
      {showWordmark ? (
        <span
          className={cn(
            'font-display text-[19px] font-bold uppercase tracking-[0.18em]',
            tone === 'light' ? 'text-white' : 'text-primary'
          )}
        >
          Sup<span className="text-brand">sto</span>
        </span>
      ) : null}
    </Link>
  )
}
