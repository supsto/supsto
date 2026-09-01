import { getTranslations } from 'next-intl/server'

import { RatingStars } from '@/components/domain/rating-stars'
import { Badge, VerifiedBadge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CompanyAvatar } from '@/components/ui/avatar'
import type { Company } from '@/lib/types'
import { formatNumber } from '@/lib/utils'

/**
 * Doğrulanmış üretici kartı.
 *
 * Kapasite, ihracat ülkeleri ve fabrika turu OPSİYONELDİR — tedarikçi
 * doldurmadıysa satır hiç çizilmez. Boş alanı "—" ile doldurmak kartı
 * eksik değil, güvenilmez gösterir.
 */
export async function ManufacturerCard({
  company,
  productCount,
}: {
  company: Company
  productCount?: number
}) {
  const t = await getTranslations('manufacturers')
  const location = [company.city, company.district].filter(Boolean).join(' / ')
  const isManufacturer =
    company.company_kind === 'manufacturer' || company.company_kind === 'both'

  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-start gap-3">
        <CompanyAvatar name={company.name} logoUrl={company.logo_url} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="info">{isManufacturer ? t('manufacturer') : t('trader')}</Badge>
            {company.verified ? <VerifiedBadge /> : null}
          </div>
          <h3 className="mt-1.5 line-clamp-2 text-sm font-bold">{company.name}</h3>
          <p className="text-[11px] text-muted">{location || '—'}</p>
        </div>
      </div>

      <dl className="mt-3 space-y-1.5 text-[11px]">
        {company.production_capacity ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted">{t('capacity')}</dt>
            <dd className="text-right font-semibold">{company.production_capacity}</dd>
          </div>
        ) : null}
        {company.export_countries.length > 0 ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted">{t('exportTo')}</dt>
            <dd className="text-right font-semibold">
              {company.export_countries.slice(0, 4).join(', ')}
              {company.export_countries.length > 4
                ? ` +${company.export_countries.length - 4}`
                : ''}
            </dd>
          </div>
        ) : null}
        {productCount !== undefined ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted">{t('trader')}</dt>
            <dd className="text-right font-semibold">{formatNumber(productCount)}</dd>
          </div>
        ) : null}
      </dl>

      {company.rating_average ? (
        <div className="mt-2 flex items-center gap-1.5">
          <RatingStars rating={company.rating_average} />
          <span className="text-[11px] tabular-nums text-muted">
            {company.rating_average.toFixed(1)} ({company.rating_count})
          </span>
        </div>
      ) : null}

      <div className="mt-auto flex gap-2 pt-4">
        <ButtonLink
          href={{ pathname: '/supplier/[slug]', params: { slug: company.slug } }}
          variant="primary"
          size="sm"
          className="flex-1"
        >
          {t('trader')}
        </ButtonLink>
        {company.factory_tour_url ? (
          <a
            href={company.factory_tour_url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex h-8 items-center rounded-field border border-line px-2.5 text-xs font-semibold hover:bg-surface-2"
          >
            {t('factoryTour')} ↗
          </a>
        ) : null}
      </div>
    </Card>
  )
}
