import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import { Container, PageHeader } from '@/components/layout/section'
import { Card, CardBody } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { softFail } from '@/lib/queries/safe'
import { formatDate, formatNumber } from '@/lib/utils'
import { TemplateForm } from './template-form'
import { TemplateActions } from './template-actions'

export const metadata: Metadata = {
  title: 'Sipariş şablonlarım',
  robots: { index: false },
}

/**
 * Düzenli sipariş şablonları.
 *
 * Şablon bir sipariş DEĞİLDİR: fiyat değişmiş, stok bitmiş olabilir.
 * Bu yüzden "tekrar sipariş ver" değil, "bu listeyle teklif iste" akışı
 * kurulur; tedarikçiler güncel fiyatla döner.
 */
export default async function TemplatesPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const t = await getTranslations('templates')
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('order_templates')
    .select(
      `id, name, note, repeat_days, last_used_at, created_at,
       order_template_items ( id, quantity, product:products ( id, title, slug, unit ) )`
    )
    .order('created_at', { ascending: false })

  const templates = error ? softFail('listTemplates', error, []) : (data ?? [])

  return (
    <Container className="py-6">
      <PageHeader title={t('title')} description={t('lead')} />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {templates.length === 0 ? (
            <Card>
              <EmptyState title={t('emptyTitle')} description={t('emptyBody')} />
            </Card>
          ) : (
            templates.map((template) => {
              const items = template.order_template_items ?? []
              return (
                <Card key={template.id}>
                  <CardBody>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-sm font-bold">{template.name}</h2>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {t('itemCount', { n: formatNumber(items.length) })}
                          {template.repeat_days
                            ? ` · ${t('repeats', { days: template.repeat_days })}`
                            : ''}
                          {template.last_used_at
                            ? ` · ${t('lastUsed', { date: formatDate(template.last_used_at) })}`
                            : ''}
                        </p>
                        {template.note ? (
                          <p className="mt-1 text-[12px] text-muted">{template.note}</p>
                        ) : null}
                      </div>
                      <TemplateActions
                        id={template.id}
                        hasItems={items.length > 0}
                      />
                    </div>

                    {items.length > 0 ? (
                      <ul className="mt-3 divide-y divide-line border-t border-line">
                        {items.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center justify-between gap-3 py-2 text-[13px]"
                          >
                            <Link
                              href={{
                                pathname: '/product/[slug]',
                                params: { slug: item.product?.slug ?? '' },
                              }}
                              className="min-w-0 truncate hover:text-brand"
                            >
                              {item.product?.title ?? '—'}
                            </Link>
                            <span className="shrink-0 font-semibold tabular-nums">
                              {formatNumber(item.quantity)} {item.product?.unit ?? ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 border-t border-line pt-3 text-[12px] text-muted">
                        {t('noItems')}
                      </p>
                    )}
                  </CardBody>
                </Card>
              )
            })
          )}
        </div>

        <aside>
          <Card>
            <CardBody>
              <h2 className="mb-1 text-sm font-bold">{t('newTitle')}</h2>
              <p className="mb-3 text-[11px] text-muted">{t('newLead')}</p>
              <TemplateForm />
            </CardBody>
          </Card>
        </aside>
      </div>
    </Container>
  )
}
