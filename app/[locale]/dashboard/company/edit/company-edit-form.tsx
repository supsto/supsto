'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { ImageUploader } from '@/components/domain/image-uploader'
import { ButtonLink } from '@/components/ui/button'
import { Card, CardBody, CardHead } from '@/components/ui/card'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { FormMessage, SubmitButton } from '@/components/ui/form-status'
import { updateCompany } from '@/lib/actions/company'
import { IDLE, type Company } from '@/lib/types'

export function CompanyEditForm({ company }: { company: Company }) {
  const t = useTranslations('form')
  const tc = useTranslations('common')
  const [state, action] = useActionState(updateCompany, IDLE)
  const errors = state.status === 'error' ? (state.fieldErrors ?? {}) : {}

  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="id" value={company.id} />

      <Card>
        <CardHead title={t('images')} />
        <CardBody>
          <ImageUploader
            companyId={company.id}
            bucket="company-logos"
            name="logo_url"
            max={1}
            initial={company.logo_url ? [company.logo_url] : []}
          />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t('companyName')}
            htmlFor="name"
            required
            error={errors.name}
            className="sm:col-span-2"
          >
            <Input id="name" name="name" required maxLength={200} defaultValue={company.name} />
          </Field>

          <Field label={t('companyType')} htmlFor="type">
            <Select id="type" name="type" defaultValue={company.type}>
              <option value="supplier">{t('typeSupplier')}</option>
              <option value="buyer">{t('typeBuyer')}</option>
              <option value="both">{t('typeBoth')}</option>
            </Select>
          </Field>

          <Field label={t('contentLanguage')} htmlFor="content_language">
            <Select
              id="content_language"
              name="content_language"
              defaultValue={company.content_language}
            >
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
              <option value="ru">Русский</option>
            </Select>
          </Field>

          <Field label={t('city')} htmlFor="city">
            <Input id="city" name="city" maxLength={60} defaultValue={company.city ?? ''} />
          </Field>
          <Field label={t('district')} htmlFor="district">
            <Input id="district" name="district" maxLength={60} defaultValue={company.district ?? ''} />
          </Field>

          <Field label={t('phone')} htmlFor="phone">
            <Input id="phone" name="phone" type="tel" defaultValue={company.phone ?? ''} />
          </Field>
          <Field label={t('whatsapp')} htmlFor="whatsapp">
            <Input id="whatsapp" name="whatsapp" type="tel" defaultValue={company.whatsapp ?? ''} />
          </Field>

          <Field label={t('website')} htmlFor="website" error={errors.website}>
            <Input id="website" name="website" type="url" defaultValue={company.website ?? ''} />
          </Field>

          <Field label="Adres" htmlFor="address" className="sm:col-span-2">
            <Textarea id="address" name="address" rows={2} maxLength={500}
              defaultValue={company.address ?? ''} />
          </Field>

          <Field
            label={t('companyAbout')}
            htmlFor="description"
            hint={t('companyAboutHint')}
            className="sm:col-span-2"
          >
            <Textarea id="description" name="description" rows={4} maxLength={2000}
              defaultValue={company.description ?? ''} />
          </Field>
        </CardBody>
      </Card>

      <div className="flex justify-end gap-2">
        <ButtonLink href="/dashboard/company">{tc('cancel')}</ButtonLink>
        <SubmitButton pendingLabel={t('saving')}>{tc('save')}</SubmitButton>
      </div>
    </form>
  )
}
