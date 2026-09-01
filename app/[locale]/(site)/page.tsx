import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'

import type { Locale } from '@/i18n/routing'
import { alternates } from '@/lib/seo'
import { Container, SectionHead } from '@/components/layout/section'
import { SearchForm } from '@/components/layout/search-form'
import { CategoryStrip } from '@/components/domain/category-strip'
import { CategoryTile } from '@/components/domain/category-tile'
import { PriceTierTable } from '@/components/domain/price-tier-table'
import { ProductCard } from '@/components/domain/product-card'
import { RfqRow } from '@/components/domain/rfq-row'
import { VerifiedBadge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { Card, CardBody, CardHead } from '@/components/ui/card'
import { CompanyAvatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { Notice } from '@/components/ui/notice'
import { getCategoryCounts, getCategoryTree } from '@/lib/queries/categories'
import { getFeaturedCompanies } from '@/lib/queries/companies'
import { getFeaturedProducts, getProductBySlug } from '@/lib/queries/products'
import { getRecentRfqs } from '@/lib/queries/rfqs'
import { getPlatformStats } from '@/lib/queries/stats'
import { formatCurrency, formatNumber } from '@/lib/utils'

const ACTIONS = [
  { href: '/search', key: 'FindProduct', image: '/assets/warehouse.svg' },
  { href: '/suppliers', key: 'FindSupplier', image: '/assets/cardboard.svg' },
  { href: '/rfq/new', key: 'PostRfq', image: '/assets/machine.svg' },
  { href: '/register', key: 'UploadCatalog', image: '/assets/electronics.svg' },
] as const

const INSIGHTS = ['1', '2', '3'] as const

export async function generateMetadata(
  props: PageProps<'/[locale]'>
): Promise<Metadata> {
  const { locale } = await props.params
  return { alternates: alternates('/', locale as Locale) }
}

export default async function HomePage() {
  const t = await getTranslations('home')

  const [stats, tree, counts, products, companies, rfqs, sample] = await Promise.all([
    getPlatformStats(),
    getCategoryTree(),
    getCategoryCounts(),
    getFeaturedProducts(4),
    getFeaturedCompanies(4),
    getRecentRfqs(4),
    getProductBySlug('karton-kutu-40x60x40'),
  ])

  // Kök kategorinin sayısı = kendi ürünleri + alt kategorilerininki.
  const categoryCount = (id: string, childIds: string[]) =>
    [id, ...childIds].reduce((sum, key) => sum + (counts.get(key) ?? 0), 0)

  // Şerit ve mozaik aynı toplamı kullanır: kök + alt kategorilerin ürünleri.
  const rootCounts = new Map(
    tree.map((c) => [c.id, categoryCount(c.id, c.children.map((x) => x.id))])
  )
  const topCategories = tree.slice(0, 6)

  return (
    <>
      {/* ---------- Hero: tam genişlik, sayfanın en üstünden başlar ----------
          -mt-16 sticky header'ın akışta kapladığı 64px'i geri alır; header
          şeffaf olarak bunun üzerinde durur. pt-16 içeriği header'ın
          altından kurtarır. data-hero, header'ın ne zaman şeffaf olacağını
          bilmesi için işaret. */}
      <section
        data-hero
        className="relative -mt-16 flex min-h-[600px] items-center overflow-hidden bg-navy pt-16 text-white md:min-h-[680px] lg:min-h-[760px]"
      >
        <Image
          src="/assets/warehouse.svg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-70"
        />
        {/* Metnin okunurluğunu garantileyen çift katman: marka gradyanı +
            sol taraftan koyulaşan okuma perdesi. */}
        <div className="absolute inset-0 bg-linear-to-br from-[#0c1f3e]/95 via-[#163b70]/88 to-[#245fba]/72" />
        <div className="absolute inset-0 bg-linear-to-r from-[#07142780] to-transparent" />

        <Container className="relative z-10 grid w-full gap-10 py-14 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.14em] text-[#8fb9ff]">
              {t('eyebrow')}
            </p>
            <h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-[1.08] md:text-5xl lg:text-[52px]">
              {t('title')}
            </h1>
            <p className="mt-4 max-w-xl text-sm text-[#d7e4fb] md:text-base">
              {t('lead')}
            </p>

            <SearchForm
              tone="dark"
              className="mt-7 max-w-xl [&_input]:h-14 [&_input]:pl-12 [&_input]:text-base"
              placeholder={t('searchPlaceholder')}
            />

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-[#b9d2f8]">
              <Link href="/rfq" className="hover:text-white">
                {t('browseRfqs')} →
              </Link>
              <Link href="/suppliers" className="hover:text-white">
                {t('verifiedSuppliers')} →
              </Link>
            </div>

            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-[#d9e6fb]">
              <li>✓ {t('trustTiers')}</li>
              <li>✓ {t('trustStock')}</li>
              <li>✓ {t('trustVerified')}</li>
            </ul>
          </div>

          {/* Gerçek verilerden beslenen kanıt kartları */}
          <div className="hidden gap-3 lg:grid">
            {products[0] ? (
              <div className="ml-auto w-64 rounded-2xl border border-white/25 bg-white/95 p-4 text-ink shadow-lift backdrop-blur-sm">
                <div className="text-[10px] text-muted">{t('liveStock')}</div>
                <div className="mt-1 text-3xl font-extrabold tabular-nums">
                  {formatNumber(products[0].stock_quantity)}{' '}
                  <span className="text-xs font-semibold text-muted">
                    {products[0].unit}
                  </span>
                </div>
                <div className="mt-1.5 line-clamp-1 text-[11px] font-bold text-success">
                  {products[0].title}
                </div>
              </div>
            ) : null}

            {companies[0] ? (
              <div className="ml-auto w-72 rounded-2xl border border-white/25 bg-white/95 p-4 text-ink shadow-lift backdrop-blur-sm">
                <div className="flex items-center gap-2.5">
                  <CompanyAvatar
                    name={companies[0].name}
                    logoUrl={companies[0].logo_url}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold">{companies[0].name}</div>
                    <div className="truncate text-[10px] text-muted">
                      {[companies[0].city, companies[0].district]
                        .filter(Boolean)
                        .join(' / ')}
                    </div>
                  </div>
                </div>
                <VerifiedBadge className="mt-3" />
              </div>
            ) : null}

            {sample && sample.price_tiers.length > 0 ? (
              <div className="ml-auto w-72 rounded-2xl border border-white/25 bg-white/95 p-4 text-ink shadow-lift backdrop-blur-sm">
                <div className="text-[10px] text-muted">{t('priceTiers')}</div>
                <div className="mt-2 space-y-1.5">
                  {sample.price_tiers.slice(0, 3).map((tier) => (
                    <div
                      key={tier.id}
                      className="flex items-baseline justify-between gap-3 text-[11px]"
                    >
                      <span className="text-muted">
                        {formatNumber(tier.min_quantity)}
                        {tier.max_quantity
                          ? `–${formatNumber(tier.max_quantity)}`
                          : '+'}{' '}
                        {sample.unit}
                      </span>
                      <b className="tabular-nums">
                        {formatCurrency(tier.unit_price, tier.currency)}
                      </b>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </Container>
      </section>

      {/* ---------- Kategori logoları ---------- */}
      <Container className="relative z-10 -mt-8 pb-2">
        <CategoryStrip categories={tree} counts={rootCounts} />
      </Container>

      <Container className="py-6">
        {/* ---------- Güven şeridi (gerçek sayımlar) ---------- */}
        <section className="mt-5 grid grid-cols-2 divide-line overflow-hidden rounded-card border border-line bg-surface sm:grid-cols-3 lg:grid-cols-5 lg:divide-x">
          {[
            [stats.companies, t('statCompanies')],
          [stats.products, t('statProducts')],
          [stats.openRfqs, t('statOpenRfqs')],
          [stats.verifiedCompanies, t('statVerified')],
          [stats.cities, t('statCities')],
          ].map(([value, label]) => (
            <div key={label as string} className="border-b border-line p-4 lg:border-b-0">
              <b className="block text-xl font-extrabold tabular-nums">
                {formatNumber(value as number)}
              </b>
              <span className="text-[11px] text-muted">{label as string}</span>
            </div>
          ))}
        </section>

        {/* ---------- Ana aksiyonlar ---------- */}
        <section className="mt-8">
          <SectionHead
            title={t('actionsTitle')}
            subtitle={t('actionsLead')}
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-start gap-3 rounded-card border border-line bg-surface p-4 transition-all hover:-translate-y-0.5 hover:shadow-card"
              >
                <span
                  className="size-11 shrink-0 rounded-xl bg-cover bg-center ring-1 ring-line"
                  style={{ backgroundImage: `url('${action.image}')` }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold group-hover:text-brand">
                    {t(`action${action.key}`)}
                  </span>
                  <span className="mt-1 block text-[11px] leading-relaxed text-muted">
                    {t(`action${action.key}Body`)}
                  </span>
                </span>
                <span className="text-lg text-faint transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ---------- Kategori mozaiği ---------- */}
        {topCategories.length > 0 ? (
          <section className="mt-8">
            <SectionHead
              title={t('popularCategories')}
              subtitle={t('popularCategoriesLead')}
              action={
                <ButtonLink href="/categories" size="sm">
                  {t('allCategories')}
                </ButtonLink>
              }
            />
            <div className="grid auto-rows-[145px] grid-cols-2 gap-4 lg:grid-cols-4">
              {topCategories.map((category, index) => (
                <CategoryTile
                  key={category.id}
                  category={category}
                  count={categoryCount(category.id, category.children.map((c) => c.id))}
                  className={index === 0 ? 'col-span-2 row-span-2' : undefined}
                />
              ))}
            </div>
          </section>
        ) : null}

        {/* ---------- Kademeli fiyat vitrini ---------- */}
        {sample ? (
          <section className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_.6fr]">
            <Card className="grid overflow-hidden md:grid-cols-2">
              <div className="relative min-h-[240px]">
                <Image
                  src={sample.images?.[0] || '/assets/placeholder.svg'}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 40vw"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col justify-center p-6">
                <span className="w-fit rounded-pill bg-brand-soft px-2 py-1 text-[11px] font-bold text-brand">
                  {t('featureBadge')}
                </span>
                <h2 className="mt-3 text-2xl font-extrabold leading-tight">
                  {t('featureTitle')}
                </h2>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">
                  {t('featureBody')}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(['featurePointMoq', 'featurePointStock', 'featurePointTiers', 'featurePointMessage'] as const).map(
                    (point) => (
                      <span
                        key={point}
                        className="rounded-[9px] border border-line bg-surface-2 p-2 text-[11px]"
                      >
                        {t(point)}
                      </span>
                    )
                  )}
                </div>
                <ButtonLink
                  href={{ pathname: '/product/[slug]', params: { slug: sample.slug } }}
                  variant="primary"
                  className="mt-4 w-fit"
                >
                  {t('featureCta')}
                </ButtonLink>
              </div>
            </Card>

            <Card>
              <CardHead
                title={t('priceExample')}
                subtitle={sample.title}
                action={<VerifiedBadge />}
              />
              <CardBody>
                <PriceTierTable tiers={sample.price_tiers} unit={sample.unit} />
                <Notice tone="success" className="mt-3.5">
                  {t('minOrder')}: <b>{formatNumber(sample.moq)} {sample.unit}</b> ·{' '}
                {t('currentStock')}: <b>{formatNumber(sample.stock_quantity)} {sample.unit}</b>
                </Notice>
              </CardBody>
            </Card>
          </section>
        ) : null}

        {/* ---------- Öne çıkan ürünler ---------- */}
        <section className="mt-8">
          <SectionHead
            title={t('featuredProducts')}
            subtitle={t('featuredProductsLead')}
            action={
              <ButtonLink href="/search" size="sm">
                {t('moreProducts')}
              </ButtonLink>
            }
          />
          {products.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <Card>
              <EmptyState
                title={t('noProducts')}
                description={t('noProductsBody')}
                action={<ButtonLink href="/register" variant="primary">{t('ctaCreateCompany')}</ButtonLink>}
              />
            </Card>
          )}
        </section>

        {/* ---------- Tedarikçiler + canlı RFQ ---------- */}
        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHead
              title={t('verifiedSuppliersTitle')}
              subtitle={t('verifiedSuppliersLead')}
              action={
                <ButtonLink href="/suppliers" size="sm">
                  {t('seeAll')}
                </ButtonLink>
              }
            />
            <CardBody className="pt-1.5">
              {companies.length > 0 ? (
                companies.map((company) => (
                  <div
                    key={company.id}
                    className="flex items-center gap-3 border-b border-line py-3 last:border-b-0"
                  >
                    <CompanyAvatar name={company.name} logoUrl={company.logo_url} />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={{ pathname: '/supplier/[slug]', params: { slug: company.slug } }}
                        className="line-clamp-1 text-[13px] font-bold hover:text-brand"
                      >
                        {company.name}
                      </Link>
                      <div className="text-[11px] text-muted">
                        {[company.city, company.district].filter(Boolean).join(' / ')}
                      </div>
                    </div>
                    <VerifiedBadge className="shrink-0" />
                  </div>
                ))
              ) : (
                <EmptyState title={t('noVerified')} />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHead
              title={t('liveRfqTitle')}
              subtitle={t('liveRfqLead')}
              action={
                <ButtonLink href="/rfq/new" variant="primary" size="sm">
                  {t('ctaCreateRfq')}
                </ButtonLink>
              }
            />
            <CardBody className="pt-1.5">
              {rfqs.length > 0 ? (
                rfqs.map((rfq) => <RfqRow key={rfq.id} rfq={rfq} />)
              ) : (
                <EmptyState
                  title={t('noOpenRfq')}
                  description={t('noOpenRfqBody')}
                />
              )}
            </CardBody>
          </Card>
        </section>

        {/* ---------- İçgörüler ---------- */}
        <section className="mt-8">
          <SectionHead
            title={t('insightsTitle')}
            subtitle={t('insightsLead')}
          />
          <div className="grid gap-4 md:grid-cols-3">
            {INSIGHTS.map((n) => (
              <Card key={n} className="p-5">
                <div className="text-[11px] font-black tracking-widest text-brand">
                  0{n}
                </div>
                <h3 className="mt-2 text-[15px] font-bold">{t(`insight${n}Title`)}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  {t(`insight${n}Body`)}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* ---------- Tedarikçi CTA ---------- */}
        <section className="mt-8 flex flex-col justify-between gap-5 rounded-[19px] bg-navy-2 p-7 text-white sm:flex-row sm:items-center">
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.14em] text-[#8fb9ff]">
              {t('ctaEyebrow')}
            </p>
            <h2 className="mt-2 text-2xl font-extrabold">
              {t('ctaTitle')}
            </h2>
            <p className="mt-1.5 text-xs text-[#c8d6e8]">
              {t('ctaBody')}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <ButtonLink href="/for-suppliers">{t('ctaSupplierSolution')}</ButtonLink>
            <ButtonLink href="/register" variant="primary">
              {t('ctaCreateCompany')}
            </ButtonLink>
          </div>
        </section>
      </Container>
    </>
  )
}
