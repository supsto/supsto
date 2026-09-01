import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Koşullu sınıfları birleştirir, çakışan Tailwind utility'lerini tekilleştirir. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const tl = new Intl.NumberFormat('tr-TR')

export function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return '—'
  return tl.format(value)
}

export function formatCurrency(
  value: number | null | undefined,
  currency = 'TRY'
) {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value)
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

const RELATIVE = new Intl.RelativeTimeFormat('tr-TR', { numeric: 'auto' })
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
]

export function formatRelative(value: string | Date | null | undefined) {
  if (!value) return '—'
  const seconds = (new Date(value).getTime() - Date.now()) / 1000
  for (const [unit, secondsInUnit] of UNITS) {
    if (Math.abs(seconds) >= secondsInUnit) {
      return RELATIVE.format(Math.round(seconds / secondsInUnit), unit)
    }
  }
  return RELATIVE.format(Math.round(seconds), 'second')
}

/** Türkçe karakterleri de doğru çeviren slug üretici. */
export function slugify(input: string) {
  const map: Record<string, string> = {
    ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i',
    ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u',
  }
  return input
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => map[ch] ?? ch)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/** Slug çakışmalarını kırmak için kısa sonek. */
export function uniqueSlug(input: string) {
  const suffix = Math.random().toString(36).slice(2, 7)
  return `${slugify(input) || 'kayit'}-${suffix}`
}

/**
 * Stok miktarını dört seviyeye eşler. Metin değil ÇEVİRİ ANAHTARI döndürür;
 * etiketi çağıran taraf `stock` namespace'inden okur.
 */
export function stockLevel(quantity: number) {
  if (quantity <= 0) return { key: 'none' as const, tone: 'danger' as const }
  if (quantity < 500) return { key: 'low' as const, tone: 'warning' as const }
  if (quantity < 5000) return { key: 'medium' as const, tone: 'brand' as const }
  return { key: 'high' as const, tone: 'success' as const }
}
