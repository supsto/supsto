import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { CompletenessMeter } from '@/components/domain/completeness-meter'
import { ProfileIdentity } from '@/components/domain/profile-identity'
import { ProfileStats, type ProfileStat } from '@/components/domain/profile-stats'
import { Badge, VerifiedBadge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { Card, CardBody, CardHead } from '@/components/ui/card'
import { CompanyAvatar } from '@/components/ui/avatar'
import { Notice } from '@/components/ui/notice'
import { canSell, profileCompleteness } from '@/lib/account'
import { getPanelContext } from '@/lib/auth/panel'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { EmailVerification } from './email-verification'
import { PasswordForm } from './password-form'
import { ProfileForm } from './profile-form'
import { VerificationRequest } from './verification-request'

export const metadata: Metadata = { title: 'Profilim', robots: { index: false } }

export default async function ProfilePage() {
  const [ctx, user, t] = await Promise.all([
    getPanelContext(),
    getCurrentUser(),
    getTranslations('profile'),
  ])
  if (!ctx || !user) return null

  const company = ctx.company
  const seller = canSell(ctx.profile)
  const supabase = await createClient()

  const count = (table: 'products' | 'rfqs' | 'quotes' | 'orders') =>
    supabase.from(table).select('id', { count: 'exact' }).limit(0)

  /*
    Sayımlar RLS altında koşar: alıcı kendi taleplerini, tedarikçi kendi
    tekliflerini görür. Ayrıca filtre yazmaya gerek yok, yanlış sayı
    gösterme riski de doğmaz.
  */
  const [
    productRes,
    rfqRes,
    quoteRes,
    orderRes,
    { data: verification },
  ] = await Promise.all([
    company
      ? supabase
          .from('products')
          .select('id', { count: 'exact' })
          .eq('company_id', company.id)
          .limit(0)
      : Promise.resolve({ count: 0 }),
    count('rfqs'),
    count('quotes'),
    count('orders'),
    company
      ? supabase
          .from('company_verifications')
          .select('*')
          .eq('company_id', company.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const productCount = productRes.count ?? 0
  const emailVerified = Boolean(user.email_confirmed_at)

  const { items, percent } = profileCompleteness({
    profile: ctx.profile,
    emailVerified,
    hasCompany: Boolean(company),
    companyVerified: Boolean(company?.verified),
    hasProducts: productCount > 0,
    hasLogo: Boolean(company?.logo_url),
    seller,
  })

  // Rol, hangi sayıların anlamlı olduğunu belirler.
  const stats: ProfileStat[] = seller
    ? [
        { key: 'products', value: productCount, href: '/dashboard/products' },
        { key: 'quotesSent', value: quoteRes.count ?? 0, href: '/dashboard/quotes' },
        { key: 'orders', value: orderRes.count ?? 0, href: '/orders' },
        {
          key: 'rating',
          value: company?.rating_count
            ? `${Number(company.rating_average ?? 0).toFixed(1)} / 5`
            : '—',
        },
      ]
    : [
        { key: 'rfqs', value: rfqRes.count ?? 0, href: '/rfq' },
        { key: 'quotesReceived', value: quoteRes.count ?? 0 },
        { key: 'orders', value: orderRes.count ?? 0, href: '/orders' },
        { key: 'favorites', value: '—', href: '/favorites' },
      ]

  return (
    <div className="space-y-4">
      <ProfileIdentity
        profile={ctx.profile}
        company={company}
        email={user.email ?? ''}
        emailVerified={emailVerified}
        trustScore={percent}
      />

      <ProfileStats stats={stats} />

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {/*
            Eksikler formların ÜSTÜNDE durur: kullanıcı sayfayı sonuna
            kadar kaydırmadan ne yapması gerektiğini görmeli.
          */}
          {percent < 100 ? (
            <CompletenessMeter items={items} percent={percent} />
          ) : null}

          <ProfileForm profile={ctx.profile} />
          <PasswordForm />
        </div>

        <aside className="space-y-4">
          {/* ---- Doğrulama merkezi ---- */}
          <Card>
            <CardHead title={t('verifications')} subtitle={t('verificationsLead')} />
            <CardBody className="space-y-3 pt-0">
              <EmailVerification verified={emailVerified} email={user.email ?? ''} />

              <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
                <span className="text-[13px]">{t('stepPhone')}</span>
                {ctx.profile?.phone_verified ? (
                  <Badge tone="success">{t('phoneVerified')}</Badge>
                ) : (
                  <Badge tone="neutral">{t('phoneNotVerified')}</Badge>
                )}
              </div>
              {!ctx.profile?.phone_verified ? (
                <p className="text-[11px] leading-relaxed text-muted">
                  {t('phoneOtpDisabled')}
                </p>
              ) : null}

              {/* Vergi numarası firma doğrulamasının ön koşulu. */}
              <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
                <span className="text-[13px]">{t('taxNumber')}</span>
                {company?.tax_number ? (
                  <Badge tone="success">{t('provided')}</Badge>
                ) : (
                  <Badge tone="neutral">{t('missing')}</Badge>
                )}
              </div>
            </CardBody>
          </Card>

          {/* ---- Firma ---- */}
          <Card>
            <CardHead
              title={t('companySection')}
              action={company?.verified ? <VerifiedBadge /> : undefined}
            />
            <CardBody className="pt-0">
              {company ? (
                <>
                  <div className="flex items-center gap-3">
                    <CompanyAvatar name={company.name} logoUrl={company.logo_url} />
                    <div className="min-w-0">
                      <div className="line-clamp-2 text-[13px] font-bold">
                        {company.name}
                      </div>
                      <div className="text-[11px] text-muted">
                        {[company.city, company.district].filter(Boolean).join(' / ') ||
                          '—'}
                      </div>
                    </div>
                  </div>

                  {/* Dışarıya yansıyan performans; yalnızca ölçüldüyse. */}
                  {company.response_rate != null || company.rating_count ? (
                    <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3">
                      {company.response_rate != null ? (
                        <div>
                          <dt className="text-[10px] uppercase tracking-wide text-muted">
                            {t('responseRate')}
                          </dt>
                          <dd className="text-[13px] font-bold tabular-nums">
                            %{company.response_rate}
                          </dd>
                        </div>
                      ) : null}
                      {company.rating_count ? (
                        <div>
                          <dt className="text-[10px] uppercase tracking-wide text-muted">
                            {t('rating')}
                          </dt>
                          <dd className="text-[13px] font-bold tabular-nums">
                            {Number(company.rating_average ?? 0).toFixed(1)} (
                            {company.rating_count})
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : null}

                  <ButtonLink
                    href="/dashboard/company/edit"
                    variant="primary"
                    className="mt-4 w-full"
                  >
                    {t('manageCompany')}
                  </ButtonLink>

                  <div className="mt-3 border-t border-line pt-3">
                    <VerificationRequest
                      companyId={company.id}
                      verified={company.verified}
                      status={verification?.status ?? null}
                      hasTaxNumber={Boolean(company.tax_number)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[13px] font-semibold">{t('noCompany')}</p>
                  <Notice tone={seller ? 'warning' : 'neutral'} className="mt-2">
                    {seller ? t('noCompanySeller') : t('noCompanyBuyer')}
                  </Notice>
                  <ButtonLink
                    href="/create-company"
                    variant="primary"
                    className="mt-3 w-full"
                  >
                    {t('createCompany')}
                  </ButtonLink>
                </>
              )}
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  )
}
