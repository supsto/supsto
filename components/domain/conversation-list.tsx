import { getTranslations } from 'next-intl/server'

import { CompanyAvatar } from '@/components/ui/avatar'
import { Link } from '@/i18n/navigation'
import type { ConversationRow } from '@/lib/queries/messages'
import { cn, formatRelative } from '@/lib/utils'

export async function ConversationList({
  conversations,
  activeId,
  viewerId,
}: {
  conversations: ConversationRow[]
  activeId?: string
  viewerId: string
}) {
  const t = await getTranslations('messages')

  return (
    <ul className="divide-y divide-line">
      {conversations.map((c) => {
        const last = c.messages.at(-1)
        const unread = c.messages.some((m) => m.sender_id !== viewerId && !m.read_at)
        // Alıcıysanız firmayı, tedarikçiyseniz alıcıyı görürsünüz.
        const isBuyer = c.buyer_id === viewerId
        const title = isBuyer ? (c.company?.name ?? '—') : (c.buyer?.full_name ?? '—')

        return (
          <li key={c.id}>
            <Link
              href={{ pathname: '/messages/[id]', params: { id: c.id } }}
              className={cn(
                'flex items-start gap-3 p-3 transition-colors hover:bg-surface-2',
                activeId === c.id && 'bg-brand-soft'
              )}
            >
              <CompanyAvatar
                name={title}
                logoUrl={isBuyer ? c.company?.logo_url : null}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="line-clamp-1 text-[13px] font-bold">{title}</span>
                  <span className="shrink-0 text-[10px] text-faint">
                    {formatRelative(c.last_message_at)}
                  </span>
                </div>
                {c.product ? (
                  <div className="line-clamp-1 text-[10px] text-brand">
                    {t('aboutProduct')}: {c.product.title}
                  </div>
                ) : c.rfq_id ? (
                  <div className="text-[10px] text-brand">{t('aboutRfq')}</div>
                ) : null}
                <p
                  className={cn(
                    'line-clamp-1 text-xs',
                    unread ? 'font-semibold text-ink' : 'text-muted'
                  )}
                >
                  {last?.sender_id === viewerId ? `${t('you')}: ` : ''}
                  {last?.body}
                </p>
              </div>
              {unread ? (
                <span className="mt-1 size-2 shrink-0 rounded-full bg-brand" aria-hidden="true" />
              ) : null}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
