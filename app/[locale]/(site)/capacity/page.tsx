import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import type { Locale } from '@/i18n/routing'
import { Link } from '@/i18n/navigation'
import { alternates } from '@/lib/seo'

import { Container, PageHeader } from '@/components/layout/section'
import { Card, CardBody } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { VerifiedBadge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { listOpenCapacity } from '@/lib/queries/capacity'
import { formatDate, formatNumber } from '@/lib/utils'

/**
 * Boş üretim kapasitesi pazarı.
 *
 * Fabrikanın boş vardiyası bugün telefonla, tanıdık üzerinden satılıyor.
 * Alıcı tarafında ise "işimi kim, ne zaman, hangi kapasiteyle yapar"
 * sorusunun toplu cevabı hiçbir yerde yok. Bu sayfa o eşleşmeyi açık
 * hale getiriyor.
 */
export async function generateMetadata(
  props: PageProps<'/[locale]/capacity'>
): Promise<Metadata> {
  const { locale } = await props.params
  const t = await getTranslations({ locale, namespace: 'capacity' })
  return {
    title: t('publicTitle'),
    description: t('publicLead'),
    alternates: await alternates('/capacity', locale as Locale),
  }
}

export default async function CapacityPage() {
  const [{ items, total }, t] = await Promise.all([
    listOpenCapacity(),
    getTranslations('capacity'),
  ])

  return (
    <Container className="py-6">
      <PageHeader
        title={t('publicTitle')}
        description={t('publicLead')}
        action={
          <ButtonLink href="/dashboard/capacity/new" variant="primary">
            {t('createCta')}
          </ButtonLink>
        }
      />

      {items.length === 0 ? (
        <Card>
          <EmptyState title={t('emptyTitle')} description={t('emptyBody')} />
        </Card>
      ) : (
        <>
          <p className="mb-3 text-[13px] text-muted">
            {t('found', { count: formatNumber(total) })}
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            {items.map((offer) => (
              <Card key={offer.id}>
                <CardBody>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-sm font-bold">{offer.title}</h2>
                      <p className="mt-0.5 text-[11px] font-semibold text-brand">
                        {offer.process}
                      </p>
                    </div>
                    {offer.company?.verified ? <VerifiedBadge /> : null}
                  </div>

                  {offer.description ? (
                    <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted">
                      {offer.description}
                    </p>
                  ) : null}

                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-line pt-3">
                    <Row
                      label={t('window')}
                      value={`${formatDate(offer.available_from)} – ${formatDate(offer.available_to)}`}
                    />
                    {offer.monthly_units ? (
                      <Row
                        label={t('monthly')}
                        value={`${formatNumber(offer.monthly_units)} ${offer.unit ?? ''}`.trim()}
                      />
                    ) : null}
                    {offer.min_batch ? (
                      <Row label={t('minBatch')} value={formatNumber(offer.min_batch)} />
                    ) : null}
                    {offer.city ? <Row label={t('city')} value={offer.city} /> : null}
                  </dl>

                  {offer.company ? (
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
                      <Link
                        href={{
                          pathname: '/supplier/[slug]',
                          params: { slug: offer.company.slug },
                        }}
                        className="text-[13px] font-bold hover:text-brand"
                      >
                        {offer.company.name}
                      </Link>
                      <Link
                        href={{
                          pathname: '/rfq/new',
                          query: { kapasite: offer.id },
                        }}
                        className="rounded-lg bg-brand px-3 py-1.5 text-[11px] font-bold text-white hover:bg-brand-strong"
                      >
                        {t('contactCta')}
                      </Link>
                    </div>
                  ) : null}
                </CardBody>
              </Card>
            ))}
          </div>
        </>
      )}
    </Container>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-[13px] font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
