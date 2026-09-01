import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { PageHeader } from '@/components/layout/section'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { markAllNotificationsRead } from '@/lib/actions/notification'
import { createClient } from '@/lib/supabase/server'
import { NotificationRow } from './notification-row'

export const metadata: Metadata = { title: 'Bildirimler', robots: { index: false } }

export default async function NotificationsPage() {
  const t = await getTranslations('notifications')
  const supabase = await createClient()

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  const unread = (notifications ?? []).filter((n) => !n.read_at).length

  return (
    <>
      <PageHeader
        title={t('title')}
        description={unread > 0 ? t('unread', { count: unread }) : t('lead')}
        action={
          unread > 0 ? (
            <form action={markAllNotificationsRead}>
              <Button type="submit" size="sm">
                {t('markAllRead')}
              </Button>
            </form>
          ) : undefined
        }
      />

      {notifications && notifications.length > 0 ? (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {notifications.map((n) => (
              <NotificationRow key={n.id} notification={n} />
            ))}
          </ul>
        </Card>
      ) : (
        <Card>
          <EmptyState title={t('empty')} description={t('emptyBody')} />
        </Card>
      )}
    </>
  )
}
