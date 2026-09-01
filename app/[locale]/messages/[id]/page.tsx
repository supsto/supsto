import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { ConversationList } from '@/components/domain/conversation-list'
import { MessageThread } from '@/components/domain/message-thread'
import { Card } from '@/components/ui/card'
import { getPanelContext } from '@/lib/auth/panel'
import { getConversation, getConversations } from '@/lib/queries/messages'
import { markConversationRead } from '@/lib/actions/message'

export const metadata: Metadata = { title: 'Mesajlar', robots: { index: false } }

export default async function ConversationPage(
  props: PageProps<'/[locale]/messages/[id]'>
) {
  const { id } = await props.params
  const [ctx, result, conversations, t] = await Promise.all([
    getPanelContext(),
    getConversation(id),
    getConversations(),
    getTranslations('messages'),
  ])

  if (!ctx || !result) notFound()

  // Açılışta karşı tarafın mesajlarını okundu say.
  await markConversationRead(id)

  const { conversation, messages } = result
  const isBuyer = conversation.buyer_id === ctx.userId
  const counterparty = isBuyer
    ? (conversation.company?.name ?? '—')
    : (conversation.buyer?.full_name ?? '—')

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card className="hidden overflow-hidden lg:block">
        <ConversationList
          conversations={conversations}
          activeId={id}
          viewerId={ctx.userId}
        />
      </Card>

      <MessageThread
        conversationId={id}
        viewerId={ctx.userId}
        counterparty={counterparty}
        logoUrl={isBuyer ? (conversation.company?.logo_url ?? null) : null}
        contextLabel={
          conversation.product
            ? `${t('aboutProduct')}: ${conversation.product.title}`
            : conversation.rfq_id
              ? t('aboutRfq')
              : null
        }
        messages={messages}
      />
    </div>
  )
}
