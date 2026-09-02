'use client'

import { useTranslations } from 'next-intl'

import { BUSINESS_KINDS, type BusinessKind } from '@/lib/business-kind'
import { cn } from '@/lib/utils'

/**
 * "Ne iş yapıyorsunuz?" — kayıt akışının ilk ve en belirleyici adımı.
 *
 * Bu seçim rolü, paneli ve profil alanlarını belirler. Sonradan
 * değiştirilebilir ama ilk izlenimi bu kurar: kullanıcı kendi işini
 * listede görürse platformun onu anladığını düşünür.
 *
 * Radyo düğmesi yerine kart: sahada tablet/telefonla kayıt yaparken
 * dokunma hedefi büyük olmalı.
 */
export function BusinessKindPicker({
  name = 'company_kind',
  value,
  onChange,
  columns = 2,
}: {
  name?: string
  value: BusinessKind | ''
  onChange: (kind: BusinessKind) => void
  columns?: 1 | 2
}) {
  const t = useTranslations('kind')

  return (
    <div
      role="radiogroup"
      aria-label={t('question')}
      className={cn('grid gap-2', columns === 2 && 'sm:grid-cols-2')}
    >
      {BUSINESS_KINDS.map((kind) => {
        const selected = value === kind
        return (
          <button
            key={kind}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(kind)}
            className={cn(
              'rounded-card border p-3.5 text-left transition-all',
              selected
                ? 'border-brand bg-brand-soft ring-1 ring-brand'
                : 'border-line bg-surface hover:border-brand/40 hover:shadow-card'
            )}
          >
            <span className="block text-[13px] font-bold">{t(`${kind}_label`)}</span>
            <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
              {t(`${kind}_hint`)}
            </span>
            {/* Örnekler, kullanıcının kendini listede bulmasını sağlar. */}
            <span className="mt-1.5 block text-[10px] leading-relaxed text-faint">
              {t(`${kind}_examples`)}
            </span>
          </button>
        )
      })}
      <input type="hidden" name={name} value={value} />
    </div>
  )
}
