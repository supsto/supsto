import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { PageHeader } from '@/components/layout/section'
import { Card, CardBody, CardHead } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Stat } from '@/components/ui/stat'
import { requireCompany } from '@/lib/auth/panel'
import { createClient } from '@/lib/supabase/server'
import { formatNumber } from '@/lib/utils'

export const metadata: Metadata = { title: 'Analitik', robots: { index: false } }

const WINDOW_DAYS = 30

/**
 * Son N günün tarih listesi. Bileşen gövdesinden çıkarıldı: React
 * Compiler saflık kuralı render sırasında `Date.now()` çağrısını
 * bildiriyor. Bu bir Server Component ve tarih her istekte yeniden
 * hesaplanmalı, dolayısıyla yardımcı fonksiyon doğru yer.
 */
function recentDays(count: number): string[] {
  const today = Date.now()
  return Array.from({ length: count }, (_, i) =>
    new Date(today - (count - 1 - i) * 86_400_000).toISOString().slice(0, 10)
  )
}

export default async function AnalyticsPage() {
  const [company, t] = await Promise.all([requireCompany(), getTranslations('analytics')])
  if (!company) return <Card><EmptyState title={t('noData')} /></Card>

  const dayList = recentDays(WINDOW_DAYS)
  const since = dayList[0]
  const supabase = await createClient()

  const { data: products } = await supabase
    .from('products')
    .select('id, title')
    .eq('company_id', company.id)

  const ids = (products ?? []).map((p) => p.id)
  const { data: stats } = ids.length
    ? await supabase
        .from('product_view_stats')
        .select('product_id, day, views')
        .in('product_id', ids)
        .gte('day', since)
    : { data: [] }

  const titleById = new Map((products ?? []).map((p) => [p.id, p.title]))
  const byProduct = new Map<string, number>()
  const byDay = new Map<string, number>()

  for (const row of stats ?? []) {
    byProduct.set(row.product_id, (byProduct.get(row.product_id) ?? 0) + row.views)
    byDay.set(row.day, (byDay.get(row.day) ?? 0) + row.views)
  }

  const total = [...byProduct.values()].reduce((a, b) => a + b, 0)
  const top = [...byProduct.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)

  // Veri olmayan gün 0 olarak çizilir; grafik boşluk bırakmasın.
  const days = dayList.map((day) => ({ day, views: byDay.get(day) ?? 0 }))
  const peak = Math.max(1, ...days.map((d) => d.views))

  return (
    <>
      <PageHeader title={t('title')} description={t('lead')} />

      {total > 0 ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Stat label={t('views30')} value={formatNumber(total)} />
            <Stat
              label={t('topProducts')}
              value={formatNumber(byProduct.size)}
            />
          </div>

          <Card>
            <CardHead title={t('views30')} />
            <CardBody>
              <div
                className="flex h-40 items-end gap-0.5"
                role="img"
                aria-label={`${t('views30')}: ${total}`}
              >
                {days.map((d) => (
                  <div
                    key={d.day}
                    title={`${d.day}: ${d.views}`}
                    style={{ height: `${Math.max(2, (d.views / peak) * 100)}%` }}
                    className="flex-1 rounded-t bg-brand-soft transition-colors hover:bg-brand"
                  />
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHead title={t('topProducts')} />
            <CardBody className="pt-0">
              <ul className="divide-y divide-line">
                {top.map(([id, views]) => (
                  <li key={id} className="flex items-center justify-between gap-4 py-2.5">
                    <span className="line-clamp-1 text-[13px]">{titleById.get(id)}</span>
                    <span className="shrink-0 text-[13px] font-bold tabular-nums">
                      {formatNumber(views)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
      ) : (
        <Card>
          <EmptyState title={t('noData')} description={t('noDataBody')} />
        </Card>
      )}
    </>
  )
}
