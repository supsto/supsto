import { getTranslations } from 'next-intl/server'

import { Badge, VerifiedBadge } from '@/components/ui/badge'
import { cn, formatDate } from '@/lib/utils'
import type { Company, Profile } from '@/lib/types'

/**
 * Profil kimlik bandı.
 *
 * B2B'de karşı taraf "bu kim" sorusunu bir bakışta yanıtlamak ister;
 * kullanıcının kendisi de hesabının dışarıdan nasıl göründüğünü görmeli.
 * Bu blok tam olarak dışarıya yansıyan bilgileri gösterir.
 */
export async function ProfileIdentity({
  profile,
  company,
  email,
  emailVerified,
  trustScore,
}: {
  profile: Profile | null
  company: Company | null
  email: string
  emailVerified: boolean
  /** Profil tamamlanma yüzdesi; güven sinyali olarak öne çıkarılır. */
  trustScore: number
}) {
  const t = await getTranslations('profile')

  const name = profile?.full_name?.trim() || email.split('@')[0]
  const initial = name.slice(0, 1).toLocaleUpperCase('tr-TR')

  // profiles.role hem yetkiyi hem hesap tipini taşıyor; 'admin' ayrı bir
  // rozet, diğerleri hesap tipidir.
  const roleLabels: string[] = []
  if (profile?.role === 'admin') roleLabels.push(t('roleAdmin'))
  else if (profile?.role === 'supplier') roleLabels.push(t('roleSupplier'))
  else if (profile?.role === 'buyer') roleLabels.push(t('roleBuyer'))
  else if (profile?.role === 'both') roleLabels.push(t('roleBoth'))

  return (
    <section className="overflow-hidden rounded-card border border-line bg-surface">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <span
          aria-hidden="true"
          className="grid size-16 shrink-0 place-items-center rounded-2xl bg-brand text-2xl font-extrabold text-white"
        >
          {initial}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-extrabold">{name}</h1>
            {company?.verified ? <VerifiedBadge /> : null}
            {roleLabels.map((label) => (
              <Badge key={label} tone="neutral">
                {label}
              </Badge>
            ))}
          </div>

          <p className="mt-0.5 truncate text-[13px] text-muted">
            {email}
            {emailVerified ? null : (
              <span className="ml-2 font-semibold text-accent">
                {t('emailNotVerified')}
              </span>
            )}
          </p>

          <p className="mt-1 text-[11px] text-muted">
            {company ? (
              <>
                <span className="font-semibold text-fg">{company.name}</span>
                {profile?.job_title ? ` · ${profile.job_title}` : ''}
                {' · '}
              </>
            ) : null}
            {profile?.created_at
              ? t('memberSince', { date: formatDate(profile.created_at) })
              : null}
          </p>
        </div>

        {/*
          Yüzde, tamamlanmamış profilin gerçekten eksik olduğunu göstermek
          için renklenir. Her hesabı yeşil göstermek ölçüyü anlamsızlaştırır.
        */}
        <div className="shrink-0 text-center">
          <div
            className={cn(
              'grid size-16 place-items-center rounded-full text-lg font-extrabold tabular-nums',
              trustScore >= 80
                ? 'bg-ok-soft text-ok'
                : trustScore >= 50
                  ? 'bg-accent-soft text-accent'
                  : 'bg-surface-2 text-muted'
            )}
          >
            %{trustScore}
          </div>
          <span className="mt-1 block text-[10px] uppercase tracking-wide text-muted">
            {t('trustScore')}
          </span>
        </div>
      </div>
    </section>
  )
}
