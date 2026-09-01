import { locale as rootLocale } from 'next/root-params'
import { getTranslations } from 'next-intl/server'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { defaultLocale, type Locale } from '@/i18n/routing'
import { markNotificationRead } from '@/lib/actions/notification'
import { localizeNotificationUrl } from '@/lib/notification-url'
import type { Notification } from '@/lib/types'
import { cn, formatRelative } from '@/lib/utils'

/** Bildirim türünü renge eşler; bilinmeyen tür nötr kalır, çökmez. */
const TONE: Record<string, 'brand' | 'success' | 'warning' | 'danger'> = {
  'quote.received': 'brand',
  'quote.accepted': 'success',
  'quote.rejected': 'danger',
  'message.received': 'brand',
  'sample.requested': 'warning',
  'order.pending': 'warning',
  'order.confirmed': 'brand',
  'order.in_production': 'brand',
  'order.shipped': 'brand',
  'order.delivered': 'success',
  'order.completed': 'success',
  'order.cancelled': 'danger',
}

export async function NotificationRow({ notification }: { notification: Notification }) {
  const [t, locale] = await Promise.all([getTranslations('notifications'), rootLocale()])
  const unread = !notification.read_at
  const href = localizeNotificationUrl(
    notification.url,
    (locale as Locale) ?? defaultLocale
  )

  return (
    <li className={cn('flex items-start gap-3 p-4', unread && 'bg-brand-soft/40')}>
      <span
        className={cn(
          'mt-1.5 size-2 shrink-0 rounded-full',
          unread ? 'bg-brand' : 'bg-line-strong'
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className={cn('text-[13px]', unread ? 'font-bold' : 'font-semibold')}>
            {notification.title}
          </span>
          <Badge tone={TONE[notification.type] ?? 'neutral'}>{notification.type}</Badge>
        </div>
        {notification.body ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted">{notification.body}</p>
        ) : null}
        <time dateTime={notification.created_at} className="mt-1 block text-[10px] text-faint">
          {formatRelative(notification.created_at)}
        </time>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {href ? (
          // href kanonik yoldan aktif dile çevrildi (localizeNotificationUrl).
          <a
            href={href}
            className="rounded-field border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold hover:bg-surface-2"
          >
            {t('open')}
          </a>
        ) : null}
        {unread ? (
          <form action={markNotificationRead}>
            <input type="hidden" name="id" value={notification.id} />
            <Button type="submit" size="sm" variant="quiet" aria-label={t('markAllRead')}>
              ✓
            </Button>
          </form>
        ) : null}
      </div>
    </li>
  )
}
