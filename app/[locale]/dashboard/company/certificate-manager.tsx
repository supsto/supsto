'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'
import { FormMessage } from '@/components/ui/form-status'
import { addCertificate, deleteCertificate } from '@/lib/actions/certificate'
import { IDLE, type CompanyCertificate } from '@/lib/types'
import { formatDate } from '@/lib/utils'

const KINDS = ['iso', 'ce', 'tse', 'halal', 'organic', 'gmp', 'fsc', 'reach', 'other'] as const

export function CertificateManager({
  companyId,
  certificates,
}: {
  companyId: string
  certificates: CompanyCertificate[]
}) {
  const t = useTranslations('admin')
  const tf = useTranslations('form')
  const [state, action] = useActionState(addCertificate, IDLE)
  const errors = state.status === 'error' ? (state.fieldErrors ?? {}) : {}

  return (
    <div>
      {certificates.length > 0 ? (
        <ul className="mb-4 divide-y divide-line">
          {certificates.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-bold">{c.name}</span>
                  <Badge tone="neutral">{c.kind.toUpperCase()}</Badge>
                  {c.verified ? (
                    <Badge tone="success">{t('verified')}</Badge>
                  ) : (
                    <Badge tone="warning">{t('notVerified')}</Badge>
                  )}
                </div>
                <div className="mt-0.5 text-[11px] text-muted">
                  {[c.issuer, c.number, c.expires_at ? formatDate(c.expires_at) : null]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              <form action={deleteCertificate}>
                <input type="hidden" name="id" value={c.id} />
                <Button type="submit" size="sm" variant="danger">
                  {tf('delete')}
                </Button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}

      <form action={action} className="grid gap-3 sm:grid-cols-2">
        <FormMessage state={state} />
        <input type="hidden" name="company_id" value={companyId} />

        <Field label="Tip" htmlFor="kind">
          <Select id="kind" name="kind" defaultValue="iso">
            {KINDS.map((k) => (
              <option key={k} value={k}>{k.toUpperCase()}</option>
            ))}
          </Select>
        </Field>
        <Field label="Ad" htmlFor="name" required error={errors.name}>
          <Input id="name" name="name" required maxLength={150} placeholder="ISO 9001:2015" />
        </Field>
        <Field label="Veren kurum" htmlFor="issuer">
          <Input id="issuer" name="issuer" maxLength={150} />
        </Field>
        <Field label="Belge no" htmlFor="number">
          <Input id="number" name="number" maxLength={80} />
        </Field>
        <Field label="Geçerlilik" htmlFor="expires_at">
          <Input id="expires_at" name="expires_at" type="date" />
        </Field>

        <div className="flex items-end">
          <Button type="submit" variant="primary">+</Button>
        </div>
      </form>
    </div>
  )
}
