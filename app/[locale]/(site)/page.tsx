import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'

import type { Locale } from '@/i18n/routing'
import { alternates } from '@/lib/seo'
import { Container, SectionHead } from '@/components/layout/section'
import { SearchForm } from '@/components/layout/search-form'
import { CategoryStrip } from '@/components/domain/category-strip'
import { ManufacturerCard } from '@/components/domain/manufacturer-card'
import { MarketTicker, buildTickerItems } from '@/components/domain/market-ticker'
import { QuickRfq } from '@/components/domain/quick-rfq'
import { CategoryTile } from '@/components/domain/category-tile'
import { PriceTierTable } from '@/components/domain/price-tier-table'
import { ProductCard } from '@/components/domain/product-card'
import { RfqRow } from '@/components/domain/rfq-row'
import { VerifiedBadge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { Card, CardBody, CardHead } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Notice } from '@/components/ui/notice'
import { getCategoryCounts, getCategoryTree } from '@/lib/queries/categories'
import { getFeaturedCompanies } from '@/lib/queries/companies'
import { getFeaturedProducts, getProductBySlug } from '@/lib/queries/products'
import { getRecentRfqs } from '@/lib/queries/rfqs'
import { getPlatformStats } from '@/lib/queries/stats'
import { formatNumber } from '@/lib/utils'

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
  return { alternates: await alternates('/', locale as Locale) }
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
  const tm = await getTranslations('manufacturers')

  // Kök kategorinin sayısı = kendi ürünleri + alt kategorilerininki.
  const categoryCount = (id: string, childIds: string[]) =>
    [id, ...childIds].reduce((sum, key) => sum + (counts.get(key) ?? 0), 0)

  // Şerit ve mozaik aynı toplamı kullanır: kök + alt kategorilerin ürünleri.
  const rootCounts = new Map(
    tree.map((c) => [c.id, categoryCount(c.id, c.children.map((x) => x.id))])
  )
  const topCategories = tree.slice(0, 6)
  const tickerItems = await buildTickerItems(stats)

  return (
    <>
      {/* ---------- Hero: tam genişlik, sayfanın en üstünden başlar ----------
          -mt-16 sticky header'ın akışta kapladığı 64px'i geri alır; header
          şeffaf olarak bunun üzerinde durur. pt-16 içeriği header'ın
          altından kurtarır. data-hero, header'ın ne zaman şeffaf olacağını
          bilmesi için işaret. */}
      <section
        data-hero
        className="relative -mt-16 flex min-h-[600px] items-center overflow-hidden bg-primary pt-16 text-white md:min-h-[680px] lg:min-h-[760px]"
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
        <div className="absolute inset-0 bg-linear-to-br from-hero-from/95 via-hero-via/88 to-hero-to/72" />
        <div className="absolute inset-0 bg-linear-to-r from-primary/50 to-transparent" />

        <Container className="relative z-10 grid w-full gap-10 py-14 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.14em] text-hero-accent">
              {t('eyebrow')}
            </p>
            <h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-[1.08] md:text-5xl lg:text-[52px]">
              {t('title')}
            </h1>
            <p className="mt-4 max-w-xl text-sm text-hero-ink md:text-base">
              {t('lead')}
            </p>

            <SearchForm
              tone="dark"
              className="mt-7 max-w-xl [&_input]:h-14 [&_input]:pl-12 [&_input]:text-base"
              placeholder={t('searchPlaceholder')}
            />

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-hero-muted">
              <Link href="/rfq" className="hover:text-white">
                {t('browseRfqs')} →
              </Link>
              <Link href="/suppliers" className="hover:text-white">
                {t('verifiedSuppliers')} →
              </Link>
            </div>

            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-hero-ink">
              <li>✓ {t('trustTiers')}</li>
              <li>✓ {t('trustStock')}</li>
              <li>✓ {t('trustVerified')}</li>
            </ul>
          </div>

          {/* Ziyaretçi kayıt olmadan teklif talebi başlatabilsin */}
          <QuickRfq categories={tree} />
        </Container>
      </section>

      {/* ---------- Kategori logoları ---------- */}
      <Container className="relative z-10 -mt-8 pb-2">
        <CategoryStrip categories={tree} counts={rootCounts} />
      </Container>

      <Container className="py-6">
        {/* ---------- Veri bandı: yalnızca doğrulanabilir sayımlar ---------- */}
        <MarketTicker items={tickerItems} />

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

        {/* ---------- Doğrulanmış üreticiler ---------- */}
        <section className="mt-8">
          <SectionHead
            title={tm('title')}
            subtitle={tm('lead')}
            action={<ButtonLink href="/suppliers" size="sm">{t('seeAll')}</ButtonLink>}
          />
          {companies.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {companies.map((company) => (
                <ManufacturerCard key={company.id} company={company} />
              ))}
            </div>
          ) : (
            <Card>
              <EmptyState title={tm('empty')} />
            </Card>
          )}
        </section>

        {/* ---------- Canlı RFQ akışı ---------- */}
        <section className="mt-8">
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
        <section className="mt-8 flex flex-col justify-between gap-5 rounded-[19px] bg-primary-2 p-7 text-white sm:flex-row sm:items-center">
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.14em] text-hero-accent">
              {t('ctaEyebrow')}
            </p>
            <h2 className="mt-2 text-2xl font-extrabold">
              {t('ctaTitle')}
            </h2>
            <p className="mt-1.5 text-xs text-hero-muted">
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
