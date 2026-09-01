import { getTranslations } from 'next-intl/server'

import { Card, CardBody } from '@/components/ui/card'
import type { CompletenessItem } from '@/lib/account'
import { cn } from '@/lib/utils'

const LABEL: Record<string, string> = {
  name: 'stepName',
  email: 'stepEmail',
  phone: 'stepPhone',
  company: 'stepCompany',
  logo: 'stepLogo',
  products: 'stepProducts',
  verification: 'stepVerification',
}

/**
 * Profil tamamlanma göstergesi. Eksik adımı söylemek, yalnızca yüzde
 * göstermekten çok daha etkili — kullanıcı ne yapacağını bilir.
 */
export async function CompletenessMeter({
  items,
  percent,
}: {
  items: CompletenessItem[]
  percent: number
}) {
  const t = await getTranslations('profile')
  const complete = percent === 100

  return (
    <Card>
      <CardBody>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-sm font-bold">{t('completeness')}</h2>
          <span
            className={cn(
              'text-2xl font-extrabold tabular-nums',
              complete ? 'text-success' : 'text-brand'
            )}
          >
            %{percent}
          </span>
        </div>

        <div
          className="mt-2 h-2 overflow-hidden rounded-pill bg-surface-2"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('completeness')}
        >
          <div
            className={cn(
              'h-full rounded-pill transition-all',
              complete ? 'bg-success' : 'bg-brand'
            )}
            style={{ width: `${percent}%` }}
          />
        </div>

        <p className="mt-2 text-[11px] text-muted">{t('completenessLead')}</p>

        <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
          {items.map((item) => (
            <li
              key={item.key}
              className={cn(
                'flex items-center gap-2 text-[13px]',
                item.done ? 'text-muted' : 'font-semibold text-ink'
              )}
            >
              <span
                className={cn(
                  'grid size-4 shrink-0 place-items-center rounded-full text-[9px] text-white',
                  item.done ? 'bg-success' : 'bg-line-strong'
                )}
                aria-hidden="true"
              >
                {item.done ? '✓' : ''}
              </span>
              <span className={item.done ? 'line-through decoration-line-strong' : undefined}>
                {t(LABEL[item.key] as 'stepName')}
              </span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  )
}
