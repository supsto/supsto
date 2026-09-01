'use client'

import { useTranslations } from 'next-intl'
import { useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { switchPanel } from '@/lib/actions/profile'
import type { PanelMode } from '@/lib/account'

/**
 * Hem alıp hem satan hesaplar için panel geçişi. Tercih profilde
 * saklanır; sonraki girişte aynı panel açılır.
 */
export function PanelSwitcher({ mode }: { mode: PanelMode }) {
  const t = useTranslations('panel')
  const [pending, startTransition] = useTransition()
  const target: PanelMode = mode === 'supplier' ? 'buyer' : 'supplier'

  return (
    <form
      action={(formData) => startTransition(() => void switchPanel(formData))}
      className="mb-4"
    >
      <input type="hidden" name="panel" value={target} />
      <Button type="submit" size="sm" variant="ghost" disabled={pending} className="w-full">
        {target === 'supplier' ? t('switchToSeller') : t('switchToBuyer')}
      </Button>
    </form>
  )
}
