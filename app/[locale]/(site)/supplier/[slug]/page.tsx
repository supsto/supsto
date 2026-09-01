import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'


import type { Locale } from '@/i18n/routing'
import { alternates } from '@/lib/seo'
import { notFound } from 'next/navigation'

import { Container, SectionHead } from '@/components/layout/section'
import { ProductCard } from '@/components/domain/product-card'
import { Badge, VerifiedBadge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { Card, CardBody, CardHead } from '@/components/ui/card'
import { CompanyAvatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { Notice } from '@/components/ui/notice'
import { ContactSupplier } from '@/components/domain/contact-supplier'
import { ProductReviews } from '@/components/domain/product-reviews'
import { RatingStars } from '@/components/domain/rating-stars'
import { ReportButton } from '@/components/domain/report-button'
import { ContentLanguageNotice } from '@/components/domain/content-language'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { getCompanyBySlug, getCompanyStats } from '@/lib/queries/companies'
import { searchProducts } from '@/lib/queries/products'
import { formatDate, formatNumber } from '@/lib/utils'

export async function generateMetadata(
  props: PageProps<'/[locale]/supplier/[slug]'>
): Promise<Metadata> {
  const { slug, locale } = await props.params
  const company = await getCompanyBySlug(slug)
  if (!company) return { title: 'Firma bulunamadı' }

  return {
    title: company.name,
    description:
      company.description ??
      `${company.name} — ${company.city ?? ''} merkezli B2B tedarikçi. Ürün kataloğu ve iletişim bilgileri.`,
    alternates: await alternates(
      { pathname: '/supplier/[slug]', params: { slug } },
      locale as Locale
    ),
  }
}

export default async function SupplierPage(props: PageProps<'/[locale]/supplier/[slug]'>) {
  const { slug, locale } = await props.params
  const [company, user, t, tc, tp, tl] = await Promise.all([
    getCompanyBySlug(slug),
    getCurrentUser(),
    getTranslations('supplier'),
    getTranslations('common'),
    getTranslations('product'),
    getTranslations('list'),
  ])
  if (!company) notFound()
  const signedIn = Boolean(user)

  const supabase = await createClient()
  const [stats, { items: products, total }, { data: certificates }, { data: reviews }] =
    await Promise.all([
      getCompanyStats(company.id),
      searchProducts({ companyId: company.id, limit: 8 }),
      supabase
        .from('company_certificates')
        .select('*')
        .eq('company_id', company.id)
        .order('verified', { ascending: false }),
      supabase
        .from('reviews')
        .select('*, author:profiles!reviews_author_id_fkey ( full_name )')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

  const contact = [
    [t('phone'), company.phone],
    [t('web'), company.website],
    [t('address'), company.address ?? [company.district, company.city].filter(Boolean).join(' / ')],
  ].filter(([, value]) => value) as [string, string][]

  return (
    <Container className="py-6">
      {/* ---- Kapak + kimlik ---- */}
      <Card className="overflow-hidden">
        <div className="h-36 bg-linear-to-br from-hero-from to-hero-to" />
        <div className="px-5 pb-5">
          <div className="-mt-9 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <CompanyAvatar
                name={company.name}
                logoUrl={company.logo_url}
                size="lg"
                className="border-4 border-surface bg-surface shadow-card"
              />
              <div className="pb-1">
                <h1 className="text-xl font-extrabold leading-tight md:text-2xl">
                  {company.name}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                  {company.verified ? (
                    <VerifiedBadge />
                  ) : (
                    <Badge tone="neutral">{tc('notVerified')}</Badge>
                  )}
                  <span>
                    {[company.city, company.district].filter(Boolean).join(' / ') || '—'}
                  </span>
                  {company.rating_average ? (
                    <span className="flex items-center gap-1">
                      <RatingStars rating={company.rating_average} />
                      <b className="tabular-nums">{company.rating_average.toFixed(1)}</b>
                      <span className="text-faint">({company.rating_count})</span>
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pb-1">
              <ContactSupplier companyId={company.id} signedIn={signedIn} />
              <ButtonLink href="/rfq/new">{tp('requestQuote')}</ButtonLink>
              <ReportButton companyId={company.id} signedIn={signedIn} />
              {company.whatsapp ? (
                <a
                  href={`https://wa.me/${company.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center rounded-field border border-line bg-surface px-3.5 text-[13px] font-semibold hover:bg-surface-2"
                >
                  WhatsApp
                </a>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [t('activeProducts'), formatNumber(stats.productCount)],
              [
                t('responseRate'),
                company.response_rate !== null ? `%${company.response_rate}` : '—',
              ],
              [
                t('avgResponse'),
                company.avg_response_hours
                  ? tc('hours', { count: company.avg_response_hours })
                  : '—',
              ],
              [t('quotesGiven'), formatNumber(stats.quoteCount)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-surface-2 p-3">
                <div className="text-[11px] text-muted">{label}</div>
                <b className="text-base">{value}</b>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ---- Hakkında / iletişim ---- */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-bold">{t('about')}</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            {company.description ?? t('noAbout')}
          </p>
          <ContentLanguageNotice
            contentLanguage={company.content_language}
            currentLocale={locale as Locale}
          />

          {company.verified && company.verified_at ? (
            <Notice tone="success" className="mt-4">
              {t('verifiedOn', { date: formatDate(company.verified_at) })}
            </Notice>
          ) : (
            <Notice tone="warning" className="mt-4">
              {t('notVerifiedNotice')}
            </Notice>
          )}
        </Card>

        <Card>
          <CardHead title={t('contact')} />
          <CardBody className="pt-0">
            {contact.length > 0 ? (
              <dl>
                {contact.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4 border-b border-line py-3 text-[13px] last:border-b-0"
                  >
                    <dt className="text-muted">{label}</dt>
                    <dd className="truncate text-right font-semibold">
                      {label === t('web') ? (
                        <a
                          href={value}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="text-brand hover:underline"
                        >
                          {value.replace(/^https?:\/\//, '')}
                        </a>
                      ) : (
                        value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="py-4 text-xs text-muted">
                {t('noContact')}
              </p>
            )}
          </CardBody>
        </Card>
      </div>

      {/* ---- Sertifikalar ---- */}
      {certificates && certificates.length > 0 ? (
        <Card className="mt-4">
          <CardHead title={t('certificates')} subtitle={t('certificatesLead')} />
          <CardBody className="pt-0">
            <ul className="grid gap-2 sm:grid-cols-2">
              {certificates.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-line p-3"
                >
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold">{c.name}</div>
                    <div className="mt-0.5 text-[11px] text-muted">
                      {[c.issuer, c.number].filter(Boolean).join(' · ') || '—'}
                    </div>
                    {c.expires_at ? (
                      <div className="text-[11px] text-faint">
                        {t('validUntil')}: {formatDate(c.expires_at)}
                      </div>
                    ) : null}
                  </div>
                  <Badge tone={c.verified ? 'success' : 'neutral'}>
                    {c.verified ? t('certVerified') : t('certPending')}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      {/* ---- Değerlendirmeler ---- */}
      <div className="mt-4">
        <ProductReviews
          reviews={(reviews ?? []) as never[]}
          average={company.rating_average}
          count={company.rating_count}
        />
      </div>

      {/* ---- Katalog ---- */}
      <section className="mt-8">
        <SectionHead
          title={tl('products')}
          subtitle={t('productCount', { count: formatNumber(total) })}
          action={
            total > products.length ? (
              <ButtonLink href={{ pathname: '/search', query: { q: company.name } }} size="sm">
                {tl('seeAllProducts')}
              </ButtonLink>
            ) : undefined
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
            />
          </Card>
        )}
      </section>
    </Container>
  )
}
