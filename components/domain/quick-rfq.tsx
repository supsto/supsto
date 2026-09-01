'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/field'
import { useRouter } from '@/i18n/navigation'
import type { LocalizedCategoryNode } from '@/lib/queries/categories'
import { cn } from '@/lib/utils'

/**
 * Ana sayfadaki hızlı teklif talebi.
 *
 * Kayıt yapmadan doldurulabilir; gönderince /rfq/new sayfasına
 * önceden doldurulmuş olarak gider. Oturum yoksa proxy girişe
 * yönlendirir ve giriş sonrası forma geri döner — kullanıcı yazdığını
 * kaybetmez.
 */
export function QuickRfq({ categories }: { categories: LocalizedCategoryNode[] }) {
  const t = useTranslations('quickRfq')
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [quantity, setQuantity] = useState('')
  const [categoryId, setCategoryId] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    router.push({
      pathname: '/rfq/new',
      query: {
        ...(title ? { title } : {}),
        ...(quantity ? { quantity } : {}),
        ...(categoryId ? { category: categoryId } : {}),
      },
    })
  }

  return (
    <form
      onSubmit={submit}
      className={cn(
        'rounded-2xl border border-white/20 bg-white/95 p-5 text-ink shadow-lift',
        'backdrop-blur-sm'
      )}
    >
      <h2 className="font-display text-lg font-bold">{t('title')}</h2>
      <p className="mt-1 text-xs text-muted">{t('lead')}</p>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-ink-soft">
            1. {t('step1')}
          </span>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('placeholder')}
            required
            maxLength={160}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-ink-soft">
              2. {t('step2')}
            </span>
            <Input
              type="number"
              min={1}
              inputMode="numeric"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="5000"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-ink-soft">
              3. {t('step3')}
            </span>
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </label>
        </div>
      </div>

      <Button type="submit" variant="primary" className="mt-4 w-full">
        {t('cta')}
      </Button>
      <p className="mt-2 text-center text-[11px] text-muted">{t('note')}</p>
    </form>
  )
}
