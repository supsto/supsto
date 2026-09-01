import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { PageHeader } from '@/components/layout/section'
import { ButtonLink } from '@/components/ui/button'
import { requireCompany } from '@/lib/auth/panel'
import { getCategoryTree } from '@/lib/queries/categories'
import { createClient } from '@/lib/supabase/server'
import { ProductForm } from '../product-form'
import { PriceTierEditor } from './price-tier-editor'

export const metadata: Metadata = { title: 'Ürün düzenle', robots: { index: false } }

export default async function EditProductPage(
  props: PageProps<'/[locale]/dashboard/products/[id]'>
) {
  const { id } = await props.params
  const [company, categories, t] = await Promise.all([
    requireCompany(),
    getCategoryTree(),
    getTranslations('productList'),
  ])
  if (!company) notFound()

  const supabase = await createClient()
  const [{ data: product }, { data: tiers }] = await Promise.all([
    supabase.from('products').select('*').eq('id', id).maybeSingle(),
    supabase.from('price_tiers').select('*').eq('product_id', id).order('min_quantity'),
  ])

  // RLS zaten başkasının ürününü döndürmez; yine de açıkça kontrol edelim.
  if (!product || product.company_id !== company.id) notFound()

  return (
    <>
      <PageHeader
        title={product.title}
        description={t('editProduct')}
        action={
          product.status === 'active' ? (
            <ButtonLink
              href={{ pathname: '/product/[slug]', params: { slug: product.slug } }}
              target="_blank"
            >
              {t('viewOnSite')} ↗
            </ButtonLink>
          ) : undefined
        }
      />

      <div className="space-y-4">
        <ProductForm companyId={company.id} categories={categories} product={product} />
        <PriceTierEditor
          productId={product.id}
          currency={product.currency}
          unit={product.unit}
          tiers={tiers ?? []}
        />
      </div>
    </>
  )
}
