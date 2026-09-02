'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { Link } from '@/i18n/navigation'
import { SubmitButton } from '@/components/ui/form-status'
import { deleteTemplate } from '@/lib/actions/templates'
import { IDLE } from '@/lib/types'

/**
 * Şablon eylemleri.
 *
 * "Tekrar sipariş ver" yerine "bu listeyle teklif iste": şablondaki
 * fiyatlar bayat olabilir, tedarikçi güncel fiyatla dönmeli.
 */
export function TemplateActions({
  id,
  hasItems,
}: {
  id: string
  hasItems: boolean
}) {
  const t = useTranslations('templates')
  const [, action] = useActionState(deleteTemplate, IDLE)

  return (
    <div className="flex shrink-0 items-center gap-2">
      {hasItems ? (
        <Link
          href={{ pathname: '/rfq/new', query: { sablon: id } }}
          className="rounded-lg bg-brand px-3 py-1.5 text-[11px] font-bold text-white hover:bg-brand-strong"
        >
          {t('reorder')}
        </Link>
      ) : null}
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <SubmitButton variant="danger">{t('delete')}</SubmitButton>
      </form>
    </div>
  )
}
