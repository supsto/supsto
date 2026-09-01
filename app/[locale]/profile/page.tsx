import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { CompletenessMeter } from '@/components/domain/completeness-meter'
import { PageHeader } from '@/components/layout/section'
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

  const [{ count: productCount }, { data: verification }] = await Promise.all([
    company
      ? supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', company.id)
      : Promise.resolve({ count: 0 }),
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

  const emailVerified = Boolean(user.email_confirmed_at)

  const { items, percent } = profileCompleteness({
    profile: ctx.profile,
    emailVerified,
    hasCompany: Boolean(company),
    companyVerified: Boolean(company?.verified),
    hasProducts: (productCount ?? 0) > 0,
    hasLogo: Boolean(company?.logo_url),
    seller,
  })

  return (
    <>
      <PageHeader title={t('title')} description={t('lead')} />

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <ProfileForm profile={ctx.profile} />
          <PasswordForm />
        </div>

        <aside className="space-y-4">
          <CompletenessMeter items={items} percent={percent} />

          {/* ---- Doğrulamalar ---- */}
          <Card>
            <CardHead title={t('verifications')} />
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
                      <div className="line-clamp-2 text-[13px] font-bold">{company.name}</div>
                      <div className="text-[11px] text-muted">
                        {[company.city, company.district].filter(Boolean).join(' / ') || '—'}
                      </div>
                    </div>
                  </div>

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
                  <ButtonLink href="/create-company" variant="primary" className="mt-3 w-full">
                    {t('createCompany')}
                  </ButtonLink>
                </>
              )}
            </CardBody>
          </Card>
        </aside>
      </div>
    </>
  )
}
