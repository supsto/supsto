'use client'

import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useTransition } from 'react'

import { usePathname, useRouter } from '@/i18n/navigation'
import { localeMeta, locales, type Locale } from '@/i18n/routing'
import { cn } from '@/lib/utils'

/**
 * Dili değiştirirken kullanıcıyı AYNI sayfanın çevirisine götürür:
 * /tr/urun/x → /en/product/x. usePathname kanonik yolu döndürdüğü için
 * router.replace hedef dilin slug'ını kendisi üretir.
 */
export function LocaleSwitcher({
  current,
  tone = 'light',
}: {
  current: Locale
  tone?: 'light' | 'dark'
}) {
  const t = useTranslations('nav')
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const [pending, startTransition] = useTransition()

  function onChange(locale: Locale) {
    startTransition(() => {
      // params dinamik segmentleri taşır ([slug], [id]); hedef dilin
      // yolunu üretmek için birlikte verilmeleri gerekir.
      //
      // pathname çalışma anında bir birleşim tipidir, bu yüzden TypeScript
      // onu tek bir params şekliyle eşleştiremez. Eşleşme çalışma anında
      // garantidir: ikisi de aynı aktif rotadan gelir.
      router.replace(
        // @ts-expect-error -- pathname/params eşleşmesi statik kanıtlanamaz
        { pathname, params },
        { locale }
      )
    })
  }

  return (
    <div
      className={cn(
        'relative inline-flex items-center rounded-field border',
        tone === 'dark'
          ? 'border-white/30 bg-white/12 backdrop-blur-sm'
          : 'border-line bg-surface',
        pending && 'opacity-60'
      )}
    >
      <label htmlFor="locale-switcher" className="sr-only">
        {t('language')}
      </label>
      <select
        id="locale-switcher"
        value={current}
        disabled={pending}
        onChange={(e) => onChange(e.target.value as Locale)}
        className={cn(
          'cursor-pointer appearance-none bg-transparent py-2 pl-2.5 pr-7 text-xs font-semibold outline-none',
          tone === 'dark' ? 'text-white' : 'text-ink'
        )}
      >
        {locales.map((locale) => (
          <option key={locale} value={locale} className="text-ink">
            {localeMeta[locale].label}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 12 12"
        className={cn(
          'pointer-events-none absolute right-2 size-3',
          tone === 'dark' ? 'text-white/70' : 'text-muted'
        )}
        aria-hidden="true"
      >
        <path fill="currentColor" d="M6 8.5 1.5 4h9z" />
      </svg>
    </div>
  )
}
