import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import type { AppHref } from '@/i18n/navigation'
import { formatNumber } from '@/lib/utils'

export interface ProfileStat {
  key: string
  value: number | string
  href?: AppHref
}

/**
 * Hesabın faaliyet özeti.
 *
 * Alıcı ile tedarikçi farklı sayılara bakar; hangi rolde olunduğu
 * gösterilen metriklerden anlaşılmalı. Sıfır değerler GİZLENMEZ —
 * "hiç teklif almadım" da bir bilgidir ve kullanıcıyı aksiyona iter.
 */
export async function ProfileStats({ stats }: { stats: ProfileStat[] }) {
  const t = await getTranslations('profile')
  if (stats.length === 0) return null

  return (
    <section className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-4">
      {stats.map((stat) => {
        const body = (
          <>
            <b className="block text-xl font-extrabold tabular-nums">
              {typeof stat.value === 'number' ? formatNumber(stat.value) : stat.value}
            </b>
            <span className="text-[11px] text-muted">{t(`stat_${stat.key}`)}</span>
          </>
        )
        return stat.href ? (
          <Link
            key={stat.key}
            href={stat.href}
            className="bg-surface p-4 transition-colors hover:bg-bg"
          >
            {body}
          </Link>
        ) : (
          <div key={stat.key} className="bg-surface p-4">
            {body}
          </div>
        )
      })}
    </section>
  )
}
