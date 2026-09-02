'use client'

import { useTranslations } from 'next-intl'

import { Field, Input, Select, Textarea } from '@/components/ui/field'
import {
  FIELD_TYPES,
  KINDS,
  PROCUREMENT_METHODS,
  SALES_CHANNELS,
  kindOf,
  type CompanyField,
} from '@/lib/business-kind'
import type { Company } from '@/lib/types'

/**
 * İş tipine özel firma alanları.
 *
 * Beş tipin alanlarını tek forma dizip gereksizleri gizlemek yerine,
 * yalnızca o tipe ait olanlar çizilir. Perakendeciye "yıllık üretim
 * adediniz" sormak, platformun onu anlamadığını söyler; sorulmayan
 * soru da doldurulmayan alan üretmez.
 */
export function KindFields({
  kind,
  company,
}: {
  kind: string | null | undefined
  company?: Company | null
}) {
  const t = useTranslations('kind')
  const resolved = kindOf(kind)
  if (!resolved) return null

  const fields = KINDS[resolved].fields
  if (fields.length === 0) return null

  return (
    <>
      {fields.map((field) => (
        <KindField key={field} field={field} company={company} t={t} />
      ))}
    </>
  )
}

function KindField({
  field,
  company,
  t,
}: {
  field: CompanyField
  company?: Company | null
  t: ReturnType<typeof useTranslations<'kind'>>
}) {
  const id = `kf_${field}`
  const label = t(`f_${field}`)
  const raw = company ? (company as unknown as Record<string, unknown>)[field] : null

  switch (FIELD_TYPES[field]) {
    case 'bool':
      /*
        Onay kutusu gönderilmediğinde tarayıcı hiçbir şey yollamaz;
        gizli alan sayesinde "işaretlenmedi" bilgisi de sunucuya ulaşır
        ve kullanıcı bir seçimi geri alabilir.
      */
      return (
        <div className="sm:col-span-2">
          <input type="hidden" name={field} value="false" />
          <label className="flex cursor-pointer items-start gap-2 text-[13px]">
            <input
              type="checkbox"
              name={field}
              value="true"
              defaultChecked={raw === true}
              className="mt-0.5 size-4 shrink-0 accent-brand"
            />
            <span>{label}</span>
          </label>
        </div>
      )

    case 'number':
      return (
        <Field label={label} htmlFor={id}>
          <Input
            id={id}
            name={field}
            type="number"
            min={0}
            defaultValue={typeof raw === 'number' ? String(raw) : ''}
          />
        </Field>
      )

    case 'url':
      return (
        <Field label={label} htmlFor={id}>
          <Input
            id={id}
            name={field}
            type="url"
            defaultValue={typeof raw === 'string' ? raw : ''}
          />
        </Field>
      )

    case 'list':
      // Dizi alanları formda virgüllü metindir; sunucu ayrıştırır.
      return (
        <Field label={label} htmlFor={id} hint={t('listHint')}>
          <Input
            id={id}
            name={field}
            defaultValue={Array.isArray(raw) ? raw.join(', ') : ''}
            maxLength={500}
          />
        </Field>
      )

    case 'channels':
      return (
        <div className="sm:col-span-2">
          <span className="mb-1.5 block text-[13px] font-semibold">{label}</span>
          <div className="flex flex-wrap gap-3">
            {SALES_CHANNELS.map((channel) => (
              <label
                key={channel}
                className="flex cursor-pointer items-center gap-1.5 text-[13px]"
              >
                <input
                  type="checkbox"
                  name={field}
                  value={channel}
                  defaultChecked={
                    Array.isArray(raw) && (raw as string[]).includes(channel)
                  }
                  className="size-4 accent-brand"
                />
                {t(`ch_${channel}`)}
              </label>
            ))}
          </div>
        </div>
      )

    case 'procurement':
      return (
        <Field label={label} htmlFor={id}>
          <Select
            id={id}
            name={field}
            defaultValue={typeof raw === 'string' ? raw : ''}
          >
            <option value="">—</option>
            {PROCUREMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {t(`pm_${method}`)}
              </option>
            ))}
          </Select>
        </Field>
      )

    default:
      return (
        <Field label={label} htmlFor={id} className="sm:col-span-2">
          <Textarea
            id={id}
            name={field}
            rows={2}
            maxLength={500}
            defaultValue={typeof raw === 'string' ? raw : ''}
          />
        </Field>
      )
  }
}
