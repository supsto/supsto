'use client'

import { useTranslations } from 'next-intl'
import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react'

import { Button, ButtonLink } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const KEY = 'supsto:compare'
const MAX = 4

interface CompareContext {
  ids: string[]
  toggle: (id: string) => void
  clear: () => void
  has: (id: string) => boolean
  full: boolean
}

const Ctx = createContext<CompareContext | null>(null)

/*
  localStorage bir DIŞ kaynaktır; React'in bunun için doğru API'si
  useSyncExternalStore. Effect içinde setState ile okumak hem lint
  kuralını ihlal eder hem de sekmeler arası değişimi kaçırırdı.

  Anlık görüntü referans olarak sabit tutulmalı: her okumada yeni dizi
  döndürmek sonsuz render döngüsü yaratır. Bu yüzden ayrıştırılmış
  değeri önbelleğe alıyoruz.
*/
const EMPTY: string[] = []
let cachedRaw: string | null = null
let cachedIds: string[] = EMPTY
const listeners = new Set<() => void>()

function readIds(): string[] {
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(KEY)
  } catch {
    // Gizli sekme veya site verisi kapalı — liste boş kalır.
    return EMPTY
  }
  if (raw === cachedRaw) return cachedIds

  cachedRaw = raw
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : []
    cachedIds = Array.isArray(parsed) ? (parsed as string[]) : EMPTY
  } catch {
    cachedIds = EMPTY
  }
  return cachedIds
}

function writeIds(next: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Yazamasak da arayüz çalışmaya devam etsin.
  }
  cachedRaw = JSON.stringify(next)
  cachedIds = next
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Diğer sekmedeki değişiklik de yansısın.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cachedRaw = null
      listener()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

/**
 * Karşılaştırma listesi tarayıcıda tutulur: oturum gerektirmez,
 * sunucuya yazmaya değmeyecek kadar geçici bir tercih.
 */
export function CompareProvider({ children }: { children: ReactNode }) {
  // Sunucuda localStorage yok; boş liste ile render edilir.
  const ids = useSyncExternalStore(subscribe, readIds, () => EMPTY)

  const value = useMemo<CompareContext>(
    () => ({
      ids,
      has: (id) => ids.includes(id),
      full: ids.length >= MAX,
      toggle: (id) =>
        writeIds(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id].slice(0, MAX)),
      clear: () => writeIds(EMPTY),
    }),
    [ids]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

function useCompare() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCompare, CompareProvider içinde kullanılmalı')
  return ctx
}

export function CompareToggle({ productId }: { productId: string }) {
  const t = useTranslations('compare')
  const { has, toggle, full } = useCompare()
  const active = has(productId)

  return (
    <button
      type="button"
      onClick={() => toggle(productId)}
      disabled={!active && full}
      aria-pressed={active}
      title={active ? t('remove') : t('add')}
      aria-label={active ? t('remove') : t('add')}
      className={cn(
        'grid size-8 place-items-center rounded-full border transition-colors',
        active
          ? 'border-brand bg-brand text-white'
          : 'border-line bg-surface/90 text-muted hover:text-brand disabled:opacity-40'
      )}
    >
      <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 7h12M4 13h12M8 4 5 7l3 3M12 10l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

/** Seçim varken ekranın altında beliren çubuk. */
export function CompareBar() {
  const t = useTranslations('compare')
  const { ids, clear } = useCompare()

  if (ids.length === 0) return null

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 mx-auto w-fit md:bottom-4">
      <div className="flex items-center gap-3 rounded-pill border border-line bg-surface px-4 py-2.5 shadow-lift">
        <span className="text-xs font-semibold">{t('bar', { count: ids.length })}</span>
        <ButtonLink
          href={{ pathname: '/compare', query: { ids: ids.join(',') } }}
          size="sm"
          variant="primary"
        >
          {t('compareNow')}
        </ButtonLink>
        <Button type="button" size="sm" variant="quiet" onClick={clear}>
          ×
        </Button>
      </div>
    </div>
  )
}
