import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { ConversationList } from '@/components/domain/conversation-list'
import { PageHeader } from '@/components/layout/section'
import { ButtonLink } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { getPanelContext } from '@/lib/auth/panel'
import { getConversations } from '@/lib/queries/messages'

export const metadata: Metadata = { title: 'Mesajlar', robots: { index: false } }

export default async function MessagesPage() {
  const [ctx, conversations, t] = await Promise.all([
    getPanelContext(),
    getConversations(),
    getTranslations('messages'),
  ])

  return (
    <>
      <PageHeader title={t('title')} description={t('lead')} />
      {conversations.length > 0 ? (
        <Card className="overflow-hidden">
          <ConversationList conversations={conversations} viewerId={ctx!.userId} />
        </Card>
      ) : (
        <Card>
          <EmptyState
            title={t('empty')}
            description={t('emptyBody')}
            action={<ButtonLink href="/search" variant="primary">{t('aboutProduct')}</ButtonLink>}
          />
        </Card>
      )}
    </>
  )
}
