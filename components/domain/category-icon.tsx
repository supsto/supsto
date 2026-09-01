import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * Kategori glifleri. Görsel dosyası yerine inline SVG: 12 kök kategorinin
 * yalnızca 6'sı için yer tutucu fotoğraf vardı ve logo şeridinde yarısı
 * aynı görünüyordu. Çizgi glifler her boyutta net, tema rengini alır ve
 * ek istek gerektirmez.
 */
const GLYPHS: Record<string, ReactNode> = {
  ambalaj: (
    <>
      <path d="M3 8.5 12 12l9-3.5M12 12v9" />
      <path d="M3 8.5 12 5l9 3.5v7L12 19l-9-3.5v-7Z" />
      <path d="M7.5 6.75 16.5 10.25" />
    </>
  ),
  elektronik: (
    <>
      <rect x="8" y="8" width="8" height="8" rx="1" />
      <path d="M10 8V5m4 3V5m-4 14v-3m4 3v-3M8 10H5m3 4H5m14-4h-3m3 4h-3" />
    </>
  ),
  tekstil: (
    <>
      <path d="M7 4h10v16H7z" />
      <path d="M7 8h10M7 12h10M7 16h10" />
      <path d="M12 4v16" />
    </>
  ),
  otomotiv: (
    <>
      <path d="M4 15v-2.2a2 2 0 0 1 .3-1L6.4 8a2 2 0 0 1 1.7-1h7.8a2 2 0 0 1 1.7 1l2.1 3.8a2 2 0 0 1 .3 1V15" />
      <path d="M4 15h16v2h-2.5M4 15v2h2.5" />
      <circle cx="8" cy="17" r="1.6" />
      <circle cx="16" cy="17" r="1.6" />
    </>
  ),
  makine: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" />
    </>
  ),
  gida: (
    <>
      <path d="M12 21V9" />
      <path d="M12 9c0-2.2-1.6-4-3.5-4C8.5 7.2 10 9 12 9Zm0 0c0-2.2 1.6-4 3.5-4C15.5 7.2 14 9 12 9Z" />
      <path d="M12 14c0-2 1.6-3.5 3.5-3.5C15.5 12.5 14 14 12 14Zm0 0c0-2-1.6-3.5-3.5-3.5C8.5 12.5 10 14 12 14Z" />
    </>
  ),
  kozmetik: (
    <>
      <path d="M10 3h4v3h-4z" />
      <path d="M9 6h6l1 3v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V9l1-3Z" />
      <path d="M8 13h8" />
    </>
  ),
  hirdavat: (
    <>
      <path d="M15.5 3.5a4.5 4.5 0 0 0-5.9 5.7L3.6 15.2a2 2 0 0 0 2.8 2.8l6-6a4.5 4.5 0 0 0 5.7-5.9l-2.6 2.6-2.3-.6-.6-2.3 2.9-2.3Z" />
    </>
  ),
  plastik: (
    <>
      <rect x="3.5" y="7" width="17" height="10" rx="1.5" />
      <path d="M3.5 10.5h17M3.5 13.5h17M9 7v10M15 7v10" />
    </>
  ),
  kirtasiye: (
    <>
      <path d="M4 17.5 15.5 6a2.1 2.1 0 0 1 3 3L7 20.5l-4 1 1-4Z" />
      <path d="M13.5 8 17 11.5" />
    </>
  ),
  kimya: (
    <>
      <path d="M9.5 3v5.2L4.8 17a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3l-4.7-8.8V3" />
      <path d="M8.5 3h7M7.4 14h9.2" />
    </>
  ),
  yapi: (
    <>
      <path d="M3 9h18v5H3z" />
      <path d="M3 14h18v5H3z" />
      <path d="M9 9V5h12v4M9 9v5m6-5v5m-3 5v-5" />
    </>
  ),
}

const FALLBACK: ReactNode = (
  <>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
  </>
)

export function CategoryIcon({
  slug,
  className,
}: {
  slug: string
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-6', className)}
      aria-hidden="true"
    >
      {GLYPHS[slug] ?? FALLBACK}
    </svg>
  )
}
