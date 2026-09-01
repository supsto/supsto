import { cn } from '@/lib/utils'

/** Puanı yıldızla gösterir. Yarım yıldız yok — B2B'de 1–5 tam puan yeterli. */
export function RatingStars({
  rating,
  size = 'sm',
  className,
}: {
  rating: number
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      role="img"
      aria-label={`${rating} / 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          viewBox="0 0 20 20"
          className={cn(
            size === 'sm' ? 'size-3.5' : 'size-5',
            star <= Math.round(rating) ? 'text-warning' : 'text-line-strong'
          )}
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="m10 1.8 2.5 5.1 5.6.8-4 4 .9 5.6-5-2.6-5 2.6.9-5.6-4-4 5.6-.8L10 1.8Z" />
        </svg>
      ))}
    </span>
  )
}
