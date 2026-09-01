import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'


import type { Locale } from '@/i18n/routing'
import { alternates } from '@/lib/seo'
import { Link } from '@/i18n/navigation'
import { notFound } from 'next/navigation'

import { Container, SectionHead } from '@/components/layout/section'
import { ContactSupplier } from '@/components/domain/contact-supplier'
import { CostCalculator } from '@/components/domain/cost-calculator'
import { FavoriteButton } from '@/components/domain/favorite-button'
import { GroupBuyProgress } from '@/components/domain/group-buy-progress'
import { PriceWithConversion } from '@/components/domain/price-with-conversion'
import { ProductAlertForm } from '@/components/domain/product-alert-form'
import { ProductReviews } from '@/components/domain/product-reviews'
import { ReportButton } from '@/components/domain/report-button'
import { SampleRequestForm } from '@/components/domain/sample-request-form'
import { TrackView } from '@/components/domain/track-view'
import { ContentLanguageNotice } from '@/components/domain/content-language'
import { PriceTierTable } from '@/components/domain/price-tier-table'
import { ProductCard } from '@/components/domain/product-card'
import { ProductImage } from '@/components/domain/product-image'
import { StockBadge } from '@/components/domain/stock-badge'
import { Badge, VerifiedBadge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { Card, CardBody, CardHead } from '@/components/ui/card'
import { CompanyAvatar } from '@/components/ui/avatar'
import { Notice } from '@/components/ui/notice'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { getProductBySlug, getRelatedProducts } from '@/lib/queries/products'
import { formatCurrency, formatNumber } from '@/lib/utils'

export async function generateMetadata(
  props: PageProps<'/[locale]/product/[slug]'>
): Promise<Metadata> {
  const { slug, locale } = await props.params
  const product = await getProductBySlug(slug)
  if (!product) return { title: 'Ürün bulunamadı' }

  return {
    title: product.title,
    description:
      product.description ??
      `${product.title} — ${product.company?.name ?? ''}. MOQ ${product.moq} ${product.unit ?? ''}.`,
    openGraph: {
      title: product.title,
      images: product.images?.[0] ? [product.images[0]] : undefined,
    },
    alternates: await alternates(
      { pathname: '/product/[slug]', params: { slug } },
      locale as Locale
    ),
  }
}

export default async function ProductPage(props: PageProps<'/[locale]/product/[slug]'>) {
  const { slug, locale } = await props.params
  const [product, user, t, tl, tc, tCommon, tg, ts] = await Promise.all([
    getProductBySlug(slug),
    getCurrentUser(),
    getTranslations('product'),
    getTranslations('list'),
    getTranslations('common'),
    getTranslations('common'),
    getTranslations('groupBuy'),
    getTranslations('supplier'),
  ])
  if (!product) notFound()

  const supabase = await createClient()
  const [{ data: favorite }, { data: pool }, { data: reviews }] = await Promise.all([
    user
      ? supabase.from('favorites').select('id').eq('product_id', product.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('group_buys')
      .select('id, target_quantity, committed_quantity, deadline, status')
      .eq('product_id', product.id)
      .in('status', ['open', 'reached'])
      .gte('deadline', new Date().toISOString().slice(0, 10))
      .order('deadline')
      .limit(1)
      .maybeSingle(),
    product.company
      ? supabase
          .from('reviews')
          .select('*, author:profiles ( full_name )')
          .eq('company_id', product.company.id)
          .order('created_at', { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
  ])

  const company = product.company
  const related = await getRelatedProducts(product)
  const attributes = Object.entries(product.attributes ?? {})
  const lowestTier = product.price_tiers.at(-1)

  const reviewList = (reviews ?? []) as never[]

  return (
    <Container className="py-6">
      <TrackView productId={product.id} />
      {/* Kırıntı */}
      <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-muted">
        <Link href="/search" className="hover:text-brand">{tl('products')}</Link>
        {product.category ? (
          <>
            <span aria-hidden="true">/</span>
            <Link href={{ pathname: '/category/[slug]', params: { slug: product.category.slug } }} className="hover:text-brand">
              {product.category.name}
            </Link>
          </>
        ) : null}
        <span aria-hidden="true">/</span>
        <span className="text-ink-soft">{product.title}</span>
      </nav>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        {/* ---- Görseller ---- */}
        <Card className="p-4">
          <ProductImage
            src={product.images?.[0]}
            alt={product.title}
            priority
            sizes="(max-width: 1024px) 100vw, 55vw"
            className="h-80 w-full rounded-xl"
          />
          {product.images && product.images.length > 1 ? (
            <div className="mt-2.5 grid grid-cols-4 gap-2.5">
              {product.images.slice(1, 5).map((image, index) => (
                <ProductImage
                  key={image}
                  src={image}
                  alt={`${product.title} görsel ${index + 2}`}
                  sizes="120px"
                  className="h-[70px] w-full rounded-[10px]"
                />
              ))}
            </div>
          ) : null}
        </Card>

        {/* ---- Ticari bilgi ---- */}
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {product.category ? (
                <div className="text-xs text-muted">{product.category.name}</div>
              ) : null}
              <h1 className="mt-1 text-2xl font-extrabold leading-tight">
                {product.title}
              </h1>
              {company ? (
                <Link
                  href={{ pathname: '/supplier/[slug]', params: { slug: company.slug } }}
                  className="mt-1.5 block text-xs text-muted hover:text-brand"
                >
                  {company.name}
                  {company.city ? ` · ${company.city}` : ''}
                </Link>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {company?.verified ? <VerifiedBadge /> : null}
              <FavoriteButton
                productId={product.id}
                initial={Boolean(favorite)}
              />
            </div>
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            {product.price_hidden ? (
              <span className="text-lg font-bold text-ink-soft">
                {t('priceOnRequestLong')}
              </span>
            ) : (
              <>
                <PriceWithConversion
                  amount={product.price}
                  currency={product.currency}
                  className="text-3xl font-extrabold tabular-nums"
                />
                <span className="text-xs text-muted">/ {product.unit}</span>
              </>
            )}
          </div>

          {lowestTier && !product.price_hidden ? (
            <p className="mt-1 text-xs text-success">
              {formatNumber(lowestTier.min_quantity)}+ {product.unit} alımda birim fiyat{' '}
              <b>{formatCurrency(lowestTier.unit_price, lowestTier.currency)}</b>
            </p>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-surface-2 p-4 sm:grid-cols-4">
            {[
              [t('stock'), formatNumber(product.stock_quantity)],
              [t('moq'), `${formatNumber(product.moq)} ${product.unit ?? ''}`],
              [t('unit'), product.unit ?? '—'],
              [
                t('response'),
                company?.avg_response_hours
                  ? tCommon('hours', { count: company.avg_response_hours })
                  : '—',
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="text-[11px] text-muted">{label}</div>
                <b className="text-sm">{value}</b>
              </div>
            ))}
          </div>

          <div className="mt-3">
            <StockBadge quantity={product.stock_quantity} showCount />
          </div>

          {product.price_tiers.length > 0 ? (
            <div className="mt-5">
              <h2 className="mb-2 text-sm font-bold">{t('tieredPricing')}</h2>
              <PriceTierTable tiers={product.price_tiers} unit={product.unit} />
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-start gap-2">
            {company ? (
              <ContactSupplier
                companyId={company.id}
                productId={product.id}
                signedIn={Boolean(user)}
              />
            ) : null}
            <ButtonLink href="/rfq/new">{t('requestQuote')}</ButtonLink>
            {product.sample_available && company ? (
              <SampleRequestForm
                companyId={company.id}
                productId={product.id}
                signedIn={Boolean(user)}
              />
            ) : null}
            {company?.whatsapp ? (
              <a
                href={`https://wa.me/${company.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center rounded-field border border-line bg-surface px-3.5 text-[13px] font-semibold hover:bg-surface-2"
              >
                WhatsApp
              </a>
            ) : null}
            {company ? (
              <ButtonLink href={{ pathname: '/supplier/[slug]', params: { slug: company.slug } }}>
                {t('companyProfile')}
              </ButtonLink>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ProductAlertForm
              productId={product.id}
              inStock={product.stock_quantity > 0}
              signedIn={Boolean(user)}
              currency={product.currency}
            />
            <ReportButton productId={product.id} signedIn={Boolean(user)} />
          </div>
        </Card>
      </div>

      {/* ---- Açıklama / teknik / firma ---- */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-bold">{t('description')}</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            {product.description ?? t('noDescription')}
          </p>
          <ContentLanguageNotice
            contentLanguage={product.content_language}
            currentLocale={locale as Locale}
          />

          {/* Ticari şartlar: B2B'de alım kararının yarısı burada verilir. */}
          {[product.incoterm, product.payment_terms, product.lead_time_days,
            product.units_per_case, product.hs_code].some(Boolean) ? (
            <>
              <h2 className="mt-5 text-sm font-bold">{ts('commercialTerms')}</h2>
              <dl className="mt-2">
                {([
                  [ts('incoterm'), product.incoterm],
                  [ts('paymentTerms'), product.payment_terms],
                  [ts('leadTime'), product.lead_time_days
                    ? ts('days', { count: product.lead_time_days }) : null],
                  [ts('unitsPerCase'), product.units_per_case
                    ? formatNumber(product.units_per_case) : null],
                  [ts('casesPerPallet'), product.cases_per_pallet
                    ? formatNumber(product.cases_per_pallet) : null],
                  [ts('hsCode'), product.hs_code],
                ] as [string, string | null][])
                  .filter(([, value]) => value)
                  .map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-4 border-b border-line py-2.5 text-[13px] last:border-b-0"
                    >
                      <dt className="text-muted">{label}</dt>
                      <dd className="text-right font-semibold">{value}</dd>
                    </div>
                  ))}
              </dl>
            </>
          ) : null}

          {attributes.length > 0 ? (
            <>
              <h2 className="mt-5 text-sm font-bold">{t('specs')}</h2>
              <dl className="mt-2">
                {attributes.map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-4 border-b border-line py-2.5 text-[13px] last:border-b-0"
                  >
                    <dt className="text-muted">{key}</dt>
                    <dd className="text-right font-semibold">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : null}
        </Card>

        {company ? (
          <Card>
            <CardHead
              title={t('supplier')}
              action={company.verified ? <VerifiedBadge /> : <Badge>{tc('notVerified')}</Badge>}
            />
            <CardBody>
              <div className="flex items-start gap-3">
                <CompanyAvatar name={company.name} logoUrl={company.logo_url} size="lg" />
                <div className="min-w-0">
                  <Link
                    href={{ pathname: '/supplier/[slug]', params: { slug: company.slug } }}
                    className="text-sm font-bold hover:text-brand"
                  >
                    {company.name}
                  </Link>
                  <div className="mt-1 text-xs text-muted">
                    {[company.city, company.district].filter(Boolean).join(' / ') || '—'}
                  </div>
                  {company.description ? (
                    <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted">
                      {company.description}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-surface-2 p-3">
                  <div className="text-[11px] text-muted">{t('responseRate')}</div>
                  <b className="text-sm">
                    {company.response_rate !== null ? `%${company.response_rate}` : '—'}
                  </b>
                </div>
                <div className="rounded-xl bg-surface-2 p-3">
                  <div className="text-[11px] text-muted">{t('avgResponse')}</div>
                  <b className="text-sm">
                    {company.avg_response_hours
                      ? tCommon('hours', { count: company.avg_response_hours })
                      : '—'}
                  </b>
                </div>
              </div>

              {!company.verified ? (
                <Notice tone="warning" className="mt-3">
                  {t('notVerifiedWarning')}
                </Notice>
              ) : null}
            </CardBody>
          </Card>
        ) : null}
      </div>

      {/* ---- Maliyet hesaplayıcı + toplu alım ---- */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <CostCalculator
          basePrice={product.price}
          currency={product.currency}
          moq={product.moq}
          unit={product.unit}
          tiers={product.price_tiers}
          unitsPerCase={product.units_per_case}
          casesPerPallet={product.cases_per_pallet}
        />

        <div className="space-y-4">
          {pool ? (
            <Card>
              <CardHead
                title={tg('activePool')}
                action={
                  <ButtonLink
                    href={{ pathname: '/group-buys/[id]', params: { id: pool.id } }}
                    size="sm"
                    variant="primary"
                  >
                    {tg('join')}
                  </ButtonLink>
                }
              />
              <CardBody className="pt-0">
                <GroupBuyProgress
                  committed={pool.committed_quantity}
                  target={pool.target_quantity}
                  unit={product.unit}
                />
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardHead title={tg('title')} subtitle={tg('explainer')} />
              <CardBody className="pt-0">
                <ButtonLink href="/group-buys" variant="primary">
                  {tg('createFor')}
                </ButtonLink>
              </CardBody>
            </Card>
          )}

          <ProductReviews
            reviews={reviewList}
            average={company?.rating_average ?? null}
            count={company?.rating_count ?? 0}
          />
        </div>
      </div>

      {/* ---- Benzer ürünler ---- */}
      {related.length > 0 ? (
        <section className="mt-8">
          <SectionHead title={t('relatedProducts')} />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </Container>
  )
}
