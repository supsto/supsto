import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'


import type { Locale } from '@/i18n/routing'
import { alternates } from '@/lib/seo'
import { Link } from '@/i18n/navigation'
import { notFound } from 'next/navigation'

import { Container } from '@/components/layout/section'
import { Badge, VerifiedBadge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { Card, CardBody, CardHead } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Notice } from '@/components/ui/notice'
import { Stat } from '@/components/ui/stat'
import { Table, TableWrap, Td, Th } from '@/components/ui/table'
import { getCurrentUser, getMyCompanies } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { countRfqQuotes, getRfqById, getRfqQuotes } from '@/lib/queries/rfqs'
import { formatCurrency, formatDate, formatNumber, formatRelative } from '@/lib/utils'
import { QuoteStatusBadge } from '@/components/domain/quote-status'
import { QuoteNegotiation } from '@/components/domain/quote-negotiation'
import { CreateOrderButton } from './create-order-button'
import { QuoteDecision } from './quote-decision'

export async function generateMetadata(props: PageProps<'/[locale]/rfq/[id]'>): Promise<Metadata> {
  const { id, locale } = await props.params
  const rfq = await getRfqById(id)
  if (!rfq) return { title: 'RFQ bulunamadı' }

  return {
    title: rfq.title,
    description: rfq.description.slice(0, 160),
    alternates: alternates(
      { pathname: '/rfq/[id]', params: { id } },
      locale as Locale
    ),
  }
}

export default async function RfqDetailPage(props: PageProps<'/[locale]/rfq/[id]'>) {
  const { id } = await props.params
  const rfq = await getRfqById(id)
  if (!rfq) notFound()

  const [user, companies, t, tc] = await Promise.all([
    getCurrentUser(),
    getMyCompanies(),
    getTranslations('rfq'),
    getTranslations('common'),
  ])
  const isOwner = user?.id === rfq.buyer_id
  const isSupplier = companies.length > 0

  // RLS gereği alıcı tüm teklifleri, tedarikçi yalnızca kendi teklifini görür.
  const [quotes, quoteCount] = await Promise.all([
    user ? getRfqQuotes(rfq.id) : Promise.resolve([]),
    countRfqQuotes(rfq.id),
  ])

  const myQuote = quotes.find((q) => companies.some((c) => c.id === q.company_id))

  // Pazarlık turları: alıcı tüm tekliflerin, tedarikçi yalnızca kendi
  // teklifinin turlarını görür (RLS zorlar).
  const supabase = await createClient()
  const { data: revisions } = quotes.length
    ? await supabase
        .from('quote_revisions')
        .select('*')
        .in('quote_id', quotes.map((q) => q.id))
        .order('created_at', { ascending: true })
    : { data: [] }

  const revisionsByQuote = new Map<string, typeof revisions>()
  for (const rev of revisions ?? []) {
    const list = revisionsByQuote.get(rev.quote_id) ?? []
    list.push(rev)
    revisionsByQuote.set(rev.quote_id, list)
  }
  const isClosed = rfq.status === 'closed'
  const deadlinePassed = rfq.deadline ? new Date(rfq.deadline) < new Date() : false

  return (
    <Container className="py-6">
      <nav className="mb-3 flex items-center gap-1.5 text-xs text-muted">
        <Link href="/rfq" className="hover:text-brand">RFQ</Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink-soft">{rfq.title}</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={isClosed ? 'danger' : 'success'}>
              {isClosed ? t('closed') : t('open')}
            </Badge>
            {rfq.category ? (
              <Link
                href={{ pathname: '/category/[slug]', params: { slug: rfq.category.slug } }}
                className="text-xs text-muted hover:text-brand"
              >
                {rfq.category.name}
              </Link>
            ) : null}
            <span className="text-xs text-faint">{formatRelative(rfq.created_at)}</span>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold md:text-[28px]">{rfq.title}</h1>
        </div>

        {!isOwner && isSupplier && !isClosed && !deadlinePassed ? (
          <ButtonLink href={{ pathname: '/rfq/[id]/quote', params: { id: rfq.id } }} variant="primary">
            {myQuote ? t('updateQuote') : t('submitQuote')}
          </ButtonLink>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHead title={t('details')} />
            <CardBody className="pt-0">
              <dl>
                {[
                  [t('quantity'), rfq.quantity ? `${formatNumber(rfq.quantity)} ${rfq.unit ?? ''}` : '—'],
                  [t('targetPrice'), rfq.target_price ? formatCurrency(rfq.target_price) : t('notSpecified')],
                  [t('leadTime'), rfq.delivery_days ? t('days', { count: rfq.delivery_days }) : '—'],
                  [t('deadline'), formatDate(rfq.deadline)],
                  [t('location'), rfq.city ?? '—'],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4 border-b border-line py-3 text-[13px] last:border-b-0"
                  >
                    <dt className="text-muted">{label}</dt>
                    <dd className="font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>

              <h2 className="mt-5 text-sm font-bold">{t('description')}</h2>
              <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-muted">
                {rfq.description}
              </p>
            </CardBody>
          </Card>

          {/* Teklifler — yalnızca taraflar görür */}
          {isOwner ? (
            <Card>
              <CardHead
                title={t('incomingQuotes')}
                subtitle={t('sortedByPrice', { count: quotes.length })}
              />
              {quotes.length > 0 ? (
                <TableWrap>
                  <Table>
                    <thead>
                      <tr>
                        <Th>{t('supplier')}</Th>
                        <Th>{t('unitPrice')}</Th>
                        <Th>MOQ</Th>
                        <Th>{t('delivery')}</Th>
                        <Th>{t('status')}</Th>
                        <Th />
                      </tr>
                    </thead>
                    <tbody>
                      {quotes.map((quote) => (
                        <tr key={quote.id} className="align-top">
                          <Td>
                            {quote.company ? (
                              <Link
                                href={{ pathname: '/supplier/[slug]', params: { slug: quote.company.slug } }}
                                className="font-bold hover:text-brand"
                              >
                                {quote.company.name}
                              </Link>
                            ) : (
                              <span className="font-bold">—</span>
                            )}
                            <div className="mt-1 flex items-center gap-1.5">
                              {quote.company?.verified ? (
                                <VerifiedBadge />
                              ) : (
                                <Badge tone="neutral">{tc('notVerified')}</Badge>
                              )}
                            </div>
                            {quote.message ? (
                              <p className="mt-1.5 max-w-sm text-[11px] leading-relaxed text-muted">
                                {quote.message}
                              </p>
                            ) : null}
                          </Td>
                          <Td className="font-bold tabular-nums">
                            {formatCurrency(quote.price, quote.currency)}
                          </Td>
                          <Td className="tabular-nums">
                            {quote.moq ? formatNumber(quote.moq) : '—'}
                          </Td>
                          <Td>{quote.delivery_days ? t('days', { count: quote.delivery_days }) : '—'}</Td>
                          <Td>
                            <QuoteStatusBadge status={quote.status} />
                          </Td>
                          <Td>
                            {quote.status === 'pending' && !isClosed ? (
                              <QuoteDecision quoteId={quote.id} rfqId={rfq.id} />
                            ) : quote.status === 'accepted' ? (
                              <CreateOrderButton quoteId={quote.id} />
                            ) : null}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrap>
              ) : (
                <EmptyState
                  title={t('noQuotes')}
                  description={t('noQuotesBody')}
                />
              )}
            </Card>
          ) : myQuote ? (
            <Card>
              <CardHead title={t('yourQuote')} />
              <CardBody className="pt-0">
                <dl>
                  {[
                    [t('unitPrice'), formatCurrency(myQuote.price, myQuote.currency)],
                    ['MOQ', myQuote.moq ? formatNumber(myQuote.moq) : '—'],
                    [t('delivery'), myQuote.delivery_days ? t('days', { count: myQuote.delivery_days }) : '—'],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-4 border-b border-line py-3 text-[13px] last:border-b-0"
                    >
                      <dt className="text-muted">{label}</dt>
                      <dd className="font-semibold">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-3">
                  <QuoteStatusBadge status={myQuote.status} />
                </div>
              </CardBody>
            </Card>
          ) : null}

          {myQuote ? (
            <QuoteNegotiation
              quoteId={myQuote.id}
              side="supplier"
              revisions={revisionsByQuote.get(myQuote.id) ?? []}
              currency={myQuote.currency}
              canNegotiate={myQuote.status === 'pending' && !isClosed}
            />
          ) : null}
        </div>

        {/* ---- Yan panel ---- */}
        <aside className="space-y-3">
          <Stat
            label={t('received')}
            value={formatNumber(quoteCount)}
            hint={isOwner ? undefined : t('onlyBuyerSees')}
          />

          {isClosed ? (
            <Notice tone="danger">
              {t('closedNotice')}
            </Notice>
          ) : deadlinePassed ? (
            <Notice tone="warning">
              {t('deadlinePassed')}
            </Notice>
          ) : !user ? (
            <Notice tone="brand">
              {t.rich('loginToQuote', {
                a: (chunks) => (
                  <Link href="/login" className="font-bold underline">
                    {chunks}
                  </Link>
                ),
              })}
            </Notice>
          ) : !isOwner && !isSupplier ? (
            <Notice tone="brand">
              {t.rich('needCompany', {
                a: (chunks) => (
                  <Link href="/create-company" className="font-bold underline">
                    {chunks}
                  </Link>
                ),
              })}
            </Notice>
          ) : null}

          {isOwner ? (
            <Notice tone="neutral">
              {t('priceLocked')}
            </Notice>
          ) : null}
        </aside>
      </div>
    </Container>
  )
}
