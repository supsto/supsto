'use client'

import { useTranslations } from 'next-intl'
import { useActionState, useEffect, useRef } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CompanyAvatar } from '@/components/ui/avatar'
import { sendMessage } from '@/lib/actions/message'
import { IDLE, type Message } from '@/lib/types'
import { cn, formatRelative } from '@/lib/utils'

export function MessageThread({
  conversationId,
  viewerId,
  counterparty,
  logoUrl,
  contextLabel,
  messages,
}: {
  conversationId: string
  viewerId: string
  counterparty: string
  logoUrl: string | null
  contextLabel: string | null
  messages: Message[]
}) {
  const t = useTranslations('messages')
  const [state, action, pending] = useActionState(sendMessage, IDLE)
  const formRef = useRef<HTMLFormElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  // Gönderim başarılıysa alanı temizle ve en alta kaydır.
  useEffect(() => {
    if (state.status === 'success') formRef.current?.reset()
  }, [state])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  return (
    <Card className="grid min-h-[520px] grid-rows-[auto_1fr_auto] overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <CompanyAvatar name={counterparty} logoUrl={logoUrl} size="sm" />
        <div className="min-w-0">
          <div className="truncate text-[13px] font-bold">{counterparty}</div>
          {contextLabel ? (
            <div className="truncate text-[11px] text-muted">{contextLabel}</div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 overflow-y-auto bg-surface-2 p-4">
        {messages.map((m) => {
          const mine = m.sender_id === viewerId
          return (
            <div
              key={m.id}
              className={cn(
                'max-w-[75%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed',
                mine
                  ? 'self-end rounded-br-md bg-brand text-white'
                  : 'self-start rounded-bl-md border border-line bg-surface'
              )}
            >
              <p className="whitespace-pre-line">{m.body}</p>
              <time
                dateTime={m.created_at}
                className={cn('mt-1 block text-[10px]', mine ? 'text-white/70' : 'text-faint')}
              >
                {formatRelative(m.created_at)}
              </time>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      <form ref={formRef} action={action} className="flex gap-2 border-t border-line p-3">
        <input type="hidden" name="conversation_id" value={conversationId} />
        <input
          name="body"
          required
          maxLength={4000}
          autoComplete="off"
          placeholder={t('placeholder')}
          aria-label={t('placeholder')}
          className="flex-1 rounded-field border border-line bg-surface px-3 py-2.5 text-sm placeholder:text-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? t('sending') : t('send')}
        </Button>
      </form>
    </Card>
  )
}
