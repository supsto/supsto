'use client'

import { useTranslations } from 'next-intl'
import { useActionState, useState } from 'react'

import { ImageUploader } from '@/components/domain/image-uploader'
import { Button, ButtonLink } from '@/components/ui/button'
import { Card, CardBody, CardHead } from '@/components/ui/card'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { FormMessage, SubmitButton } from '@/components/ui/form-status'
import { createProduct, deleteProduct, updateProduct } from '@/lib/actions/product'
import type { LocalizedCategoryNode } from '@/lib/queries/categories'
import { IDLE, type Product } from '@/lib/types'

const INCOTERMS = [
  'EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP',
] as const
const CURRENCIES = ['TRY', 'USD', 'EUR', 'RUB'] as const
const UNITS = ['adet', 'kg', 'metre', 'litre', 'paket', 'koli', 'rulo', 'set', 'ton']

export function ProductForm({
  companyId,
  categories,
  product,
}: {
  companyId: string
  categories: LocalizedCategoryNode[]
  product?: Product
}) {
  const t = useTranslations('form')
  const tc = useTranslations('common')
  const [state, action] = useActionState(product ? updateProduct : createProduct, IDLE)
  const [sampleOn, setSampleOn] = useState(product?.sample_available ?? false)
  const errors = state.status === 'error' ? (state.fieldErrors ?? {}) : {}

  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="company_id" value={companyId} />
      {product ? <input type="hidden" name="id" value={product.id} /> : null}

      {/* ---- Temel bilgiler ---- */}
      <Card>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t('productName')}
            htmlFor="title"
            required
            error={errors.title}
            className="sm:col-span-2"
          >
            <Input id="title" name="title" required maxLength={200}
              defaultValue={product?.title} aria-invalid={!!errors.title} />
          </Field>

          <Field label={t('category')} htmlFor="category_id" error={errors.category_id}>
            <Select id="category_id" name="category_id" defaultValue={product?.category_id ?? ''}>
              <option value="">{t('selectCategory')}</option>
              {categories.map((root) => (
                <optgroup key={root.id} label={root.name}>
                  <option value={root.id}>{root.name}</option>
                  {root.children.map((child) => (
                    <option key={child.id} value={child.id}>{child.name}</option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>

          <Field label={t('brand')} htmlFor="brand" error={errors.brand}>
            <Input id="brand" name="brand" maxLength={100} defaultValue={product?.brand ?? ''} />
          </Field>

          <Field label={t('description')} htmlFor="description" className="sm:col-span-2">
            <Textarea id="description" name="description" rows={5} maxLength={4000}
              defaultValue={product?.description ?? ''} />
          </Field>

          <Field
            label={t('contentLanguage')}
            htmlFor="content_language"
            hint={t('contentLanguageHint')}
            className="sm:col-span-2 sm:max-w-64"
          >
            <Select id="content_language" name="content_language"
              defaultValue={product?.content_language ?? 'tr'}>
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
              <option value="ru">Русский</option>
            </Select>
          </Field>
        </CardBody>
      </Card>

      {/* ---- Görseller ---- */}
      <Card>
        <CardHead title={t('images')} />
        <CardBody>
          <ImageUploader companyId={companyId} initial={product?.images ?? []} />
        </CardBody>
      </Card>

      {/* ---- Fiyat & stok ---- */}
      <Card>
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <Field label={t('basePrice')} htmlFor="price" error={errors.price}>
            <Input id="price" name="price" type="number" min={0} step="0.01"
              inputMode="decimal" defaultValue={product?.price ?? ''} />
          </Field>

          <Field label={t('currency')} htmlFor="currency">
            <Select id="currency" name="currency" defaultValue={product?.currency ?? 'TRY'}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>

          <Field label={t('unit')} htmlFor="unit">
            <Select id="unit" name="unit" defaultValue={product?.unit ?? 'adet'}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </Select>
          </Field>

          <Field label={t('moq')} htmlFor="moq" required error={errors.moq}>
            <Input id="moq" name="moq" type="number" min={1} required
              defaultValue={product?.moq ?? 1} aria-invalid={!!errors.moq} />
          </Field>

          <Field label={t('stock')} htmlFor="stock_quantity" required error={errors.stock_quantity}>
            <Input id="stock_quantity" name="stock_quantity" type="number" min={0} required
              defaultValue={product?.stock_quantity ?? 0} />
          </Field>

          <Field label={t('minOrderValue')} htmlFor="min_order_value">
            <Input id="min_order_value" name="min_order_value" type="number" min={0} step="0.01"
              defaultValue={product?.min_order_value ?? ''} />
          </Field>

          <label className="flex items-center gap-2 text-[13px] sm:col-span-3">
            <input type="checkbox" name="price_hidden" defaultChecked={product?.price_hidden}
              className="size-4 accent-[var(--color-brand)]" />
            {t('hidePrice')}
          </label>
        </CardBody>
      </Card>

      {/* ---- Ticari şartlar ---- */}
      <Card>
        <CardHead title={t('commercialTerms')} />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label={t('incoterm')} htmlFor="incoterm">
            <Select id="incoterm" name="incoterm" defaultValue={product?.incoterm ?? ''}>
              <option value="">—</option>
              {INCOTERMS.map((i) => <option key={i} value={i}>{i}</option>)}
            </Select>
          </Field>

          <Field label={t('leadTime')} htmlFor="lead_time_days">
            <Input id="lead_time_days" name="lead_time_days" type="number" min={1} max={365}
              defaultValue={product?.lead_time_days ?? ''} />
          </Field>

          <Field label={t('paymentTerms')} htmlFor="payment_terms" className="sm:col-span-2">
            <Input id="payment_terms" name="payment_terms" maxLength={200}
              placeholder={t('paymentTermsPlaceholder')}
              defaultValue={product?.payment_terms ?? ''} />
          </Field>

          <Field label={t('unitsPerCase')} htmlFor="units_per_case">
            <Input id="units_per_case" name="units_per_case" type="number" min={1}
              defaultValue={product?.units_per_case ?? ''} />
          </Field>

          <Field label={t('casesPerPallet')} htmlFor="cases_per_pallet">
            <Input id="cases_per_pallet" name="cases_per_pallet" type="number" min={1}
              defaultValue={product?.cases_per_pallet ?? ''} />
          </Field>

          <Field label={t('hsCode')} htmlFor="hs_code">
            <Input id="hs_code" name="hs_code" maxLength={20} defaultValue={product?.hs_code ?? ''} />
          </Field>
        </CardBody>
      </Card>

      {/* ---- Numune ---- */}
      <Card>
        <CardHead title={t('sampleSection')} />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-[13px] sm:col-span-2">
            <input type="checkbox" name="sample_available" defaultChecked={sampleOn}
              onChange={(e) => setSampleOn(e.target.checked)}
              className="size-4 accent-[var(--color-brand)]" />
            {t('sampleAvailable')}
          </label>
          {sampleOn ? (
            <Field label={t('samplePrice')} htmlFor="sample_price">
              <Input id="sample_price" name="sample_price" type="number" min={0} step="0.01"
                defaultValue={product?.sample_price ?? ''} />
            </Field>
          ) : null}
        </CardBody>
      </Card>

      {/* ---- Yayın durumu ---- */}
      <Card>
        <CardBody className="flex flex-wrap items-end justify-between gap-4">
          <Field label={t('status')} htmlFor="status" className="max-w-56 flex-1">
            <Select id="status" name="status" defaultValue={product?.status ?? 'draft'}>
              <option value="active">{t('statusActive')}</option>
              <option value="passive">{t('statusPassive')}</option>
              <option value="draft">{t('statusDraft')}</option>
            </Select>
          </Field>

          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/dashboard/products">{tc('cancel')}</ButtonLink>
            <SubmitButton pendingLabel={t('saving')}>{t('saveProduct')}</SubmitButton>
          </div>
        </CardBody>
      </Card>

      {product ? (
        <Card className="border-danger/30">
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">{t('deleteProductConfirm')}</p>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              formAction={deleteProduct}
              formNoValidate
            >
              {t('delete')}
            </Button>
          </CardBody>
        </Card>
      ) : null}
    </form>
  )
}
