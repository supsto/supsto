'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useTransition } from 'react'

import {
  COMMON_INCOTERMS,
  FEATURED_CERTIFICATES,
  PRODUCTION_TYPES,
} from '@/lib/catalog'
import { cn } from '@/lib/utils'

/**
 * Katalog sol paneli.
 *
 * Tüm durum URL'de tutulur: filtreli bir liste paylaşılabilir, geri tuşu
 * çalışır ve sayfa sunucuda yeniden render edilir. Bileşen hiçbir yerel
 * kopya tutmaz — tek doğru kaynak adres çubuğudur.
 */
export function CatalogFilters({
  cities,
  className,
}: {
  cities: string[]
  className?: string
}) {
  const t = useTranslations('catalog')
  const tc = useTranslations('common')
  const router = useRouter()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  function push(next: URLSearchParams) {
    next.delete('sayfa') // filtre değişince ilk sayfaya dön
    startTransition(() => router.push(`?${next}`))
  }

  function setParam(name: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(name, value)
    else next.delete(name)
    push(next)
  }

  /** Çoklu seçim: değer listede varsa çıkar, yoksa ekle. */
  function toggle(name: string, value: string) {
    const current = (params.get(name) ?? '').split(',').filter(Boolean)
    const next = new URLSearchParams(params)
    const without = current.filter((v) => v !== value)
    const updated = without.length === current.length ? [...current, value] : without
    if (updated.length) next.set(name, updated.join(','))
    else next.delete(name)
    push(next)
  }

  const has = (name: string, value: string) =>
    (params.get(name) ?? '').split(',').includes(value)

  const activeCount = [
    'moq',
    'fiyat_min',
    'fiyat_max',
    'termin',
    'incoterm',
    'uretim',
    'sertifika',
    'sehir',
    'dogrulanmis',
    'stokta',
  ].filter((n) => params.get(n)).length

  return (
    <aside
      className={cn(
        'shrink-0 space-y-5 lg:w-[280px]',
        pending && 'pointer-events-none opacity-60',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">{t('title')}</h2>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => startTransition(() => router.push('?'))}
            className="text-[11px] font-semibold text-brand hover:underline"
          >
            {tc('clearFilters')} ({activeCount})
          </button>
        )}
      </div>

      <Group title={t('moq')}>
        <NumberField
          name="moq"
          suffix={t('moqSuffix')}
          placeholder={t('moqPlaceholder')}
          value={params.get('moq') ?? ''}
          onCommit={setParam}
        />
      </Group>

      <Group title={t('price')}>
        <div className="flex items-center gap-2">
          <NumberField
            name="fiyat_min"
            placeholder={t('min')}
            value={params.get('fiyat_min') ?? ''}
            onCommit={setParam}
          />
          <span className="text-muted">–</span>
          <NumberField
            name="fiyat_max"
            placeholder={t('max')}
            value={params.get('fiyat_max') ?? ''}
            onCommit={setParam}
          />
        </div>
        <p className="mt-1 text-[10px] leading-relaxed text-muted">
          {t('priceHint')}
        </p>
      </Group>

      <Group title={t('leadTime')}>
        <NumberField
          name="termin"
          suffix={t('days')}
          placeholder={t('leadTimePlaceholder')}
          value={params.get('termin') ?? ''}
          onCommit={setParam}
        />
      </Group>

      <Group title={t('incoterm')}>
        {COMMON_INCOTERMS.map((code) => (
          <Check
            key={code}
            checked={has('incoterm', code)}
            onChange={() => toggle('incoterm', code)}
            label={code}
            hint={t(`incoterm_${code}`)}
          />
        ))}
      </Group>

      <Group title={t('productionType')}>
        {PRODUCTION_TYPES.map((kind) => (
          <Check
            key={kind}
            checked={has('uretim', kind)}
            onChange={() => toggle('uretim', kind)}
            label={t(`production_${kind}`)}
            hint={t(`production_${kind}_hint`)}
          />
        ))}
      </Group>

      <Group title={t('certificates')}>
        {FEATURED_CERTIFICATES.map((kind) => (
          <Check
            key={kind}
            checked={has('sertifika', kind)}
            onChange={() => toggle('sertifika', kind)}
            label={t(`cert_${kind}`)}
          />
        ))}
        <p className="mt-1 text-[10px] leading-relaxed text-muted">
          {t('certificatesHint')}
        </p>
      </Group>

      <Group title={t('location')}>
        <select
          value={params.get('sehir') ?? ''}
          onChange={(e) => setParam('sehir', e.target.value)}
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs"
        >
          <option value="">{tc('allCities')}</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Group>

      <Group title={t('supplier')}>
        <Check
          checked={params.get('dogrulanmis') === '1'}
          onChange={() => setParam('dogrulanmis', params.get('dogrulanmis') ? '' : '1')}
          label={tc('verifiedOnly')}
        />
        <Check
          checked={params.get('stokta') === '1'}
          onChange={() => setParam('stokta', params.get('stokta') ? '' : '1')}
          label={t('inStock')}
        />
      </Group>
    </aside>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-surface p-3">
      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </section>
  )
}

function Check({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: () => void
  label: string
  hint?: string
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-xs">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 size-3.5 shrink-0 accent-brand"
      />
      <span className="min-w-0">
        <span className="font-medium">{label}</span>
        {hint && <span className="block text-[10px] text-muted">{hint}</span>}
      </span>
    </label>
  )
}

/**
 * Sayı alanı Enter veya odak kaybında uygulanır.
 *
 * Her tuş vuruşunda gezinmek sunucuya gereksiz istek yağdırır ve
 * kullanıcı sayıyı yazarken liste altında kayar.
 */
function NumberField({
  name,
  value,
  placeholder,
  suffix,
  onCommit,
}: {
  name: string
  value: string
  placeholder: string
  suffix?: string
  onCommit: (name: string, value: string) => void
}) {
  return (
    <span className="flex items-center gap-1">
      <input
        type="number"
        min={0}
        name={name}
        defaultValue={value}
        placeholder={placeholder}
        onBlur={(e) => {
          if (e.target.value !== value) onCommit(name, e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs tabular-nums"
      />
      {suffix && <span className="text-[10px] text-muted">{suffix}</span>}
    </span>
  )
}
