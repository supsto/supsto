import { Link } from '@/i18n/navigation'

import { getTranslations } from 'next-intl/server'

import { Badge, VerifiedBadge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CompanyAvatar } from '@/components/ui/avatar'
import type { Company } from '@/lib/types'

export async function SupplierCard({ company }: { company: Company }) {
  const t = await getTranslations('common')
  const location = [company.city, company.district].filter(Boolean).join(' / ')

  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-start gap-3">
        <CompanyAvatar name={company.name} logoUrl={company.logo_url} />
        <div className="min-w-0 flex-1">
          <Link
            href={{ pathname: '/supplier/[slug]', params: { slug: company.slug } }}
            className="line-clamp-2 text-sm font-bold leading-snug hover:text-brand"
          >
            {company.name}
          </Link>
          <div className="mt-1 text-xs text-muted">{location || '—'}</div>
        </div>
      </div>

      {company.description ? (
        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted">
          {company.description}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {company.verified ? <VerifiedBadge /> : <Badge tone="neutral">{t('notVerified')}</Badge>}
        {company.response_rate !== null ? (
          <span className="text-[11px] text-muted">%{company.response_rate}</span>
        ) : null}
      </div>

      <ButtonLink
        href={{ pathname: '/supplier/[slug]', params: { slug: company.slug } }}
        variant="primary"
        size="sm"
        className="mt-4 w-full"
      >
        {t('viewProfile')}
      </ButtonLink>
    </Card>
  )
}
