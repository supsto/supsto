import { cn } from '@/lib/utils'

/**
 * Supsto amblemi.
 *
 * İki iç içe izometrik küp:
 *   · dıştaki küp  → tedarikçi/üretici ekosistemi
 *   · içteki küp   → perakendeci/alıcı
 * İkisinin kesiştiği hat bir S oluşturur ve ticaretin bu iki katman
 * arasında akışını temsil eder.
 *
 * Küp kenarları `currentColor` kullanır (koyu/açık zeminde çalışır);
 * S daima marka yeşilidir — eylemin ve onaylanmış işlemin rengi.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={cn('size-9', className)}
      fill="none"
      aria-hidden="true"
    >
      {/* Dış küp — tedarikçi ekosistemi */}
      <g
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.9"
      >
        <path d="M20 3.2 34.6 11.6v16.8L20 36.8 5.4 28.4V11.6Z" />
        <path d="M5.4 11.6 20 20l14.6-8.4M20 20v16.8" opacity="0.45" />
      </g>

      {/* İç küp — alıcı */}
      <g
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.5"
      >
        <path d="M20 11.4 27.6 15.8v8.8L20 29l-7.6-4.4v-8.8Z" />
      </g>

      {/* Kesişim — S */}
      <path
        d="M26.2 14.4c0-2.5-3-4.1-6.2-2.6-3.4 1.6-3.8 5.2-.7 6.9l1.9 1.1c3.2 1.8 2.8 5.4-.6 7-3.2 1.5-6.3-.1-6.3-2.6"
        stroke="var(--color-brand)"
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
