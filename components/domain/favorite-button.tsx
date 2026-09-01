'use client'

import { useTranslations } from 'next-intl'
import { useOptimistic, useTransition } from 'react'

import { toggleFavorite } from '@/lib/actions/favorite'
import { cn } from '@/lib/utils'

/**
 * Kalp simgesi. İyimser güncelleme kullanır: sunucu yanıtı beklenmeden
 * dolar/boşalır, böylece liste sayfalarında tıklama anında hissedilir.
 */
export function FavoriteButton({
  productId,
  companyId,
  initial,
  className,
}: {
  productId?: string
  companyId?: string
  initial: boolean
  className?: string
}) {
  const t = useTranslations('favorites')
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useOptimistic(initial)

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          setSaved(!saved)
          await toggleFavorite(formData)
        })
      }
      className={className}
    >
      {productId ? <input type="hidden" name="product_id" value={productId} /> : null}
      {companyId ? <input type="hidden" name="company_id" value={companyId} /> : null}
      <button
        type="submit"
        disabled={pending}
        aria-pressed={saved}
        aria-label={saved ? t('remove') : t('add')}
        title={saved ? t('remove') : t('add')}
        className={cn(
          'grid size-8 place-items-center rounded-full border transition-colors',
          saved
            ? 'border-danger/30 bg-danger-soft text-danger'
            : 'border-line bg-surface/90 text-muted hover:text-danger'
        )}
      >
        <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
          <path
            fill={saved ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.6"
            d="M10 16.5 3.8 10.6a3.9 3.9 0 0 1 5.5-5.5l.7.7.7-.7a3.9 3.9 0 0 1 5.5 5.5L10 16.5Z"
          />
        </svg>
      </button>
    </form>
  )
}
