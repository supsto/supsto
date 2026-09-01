'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useRef, useState, useTransition } from 'react'

import { Notice } from '@/components/ui/notice'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const BUCKET = 'product-images'
const MAX_BYTES = 5 * 1024 * 1024
const MAX_IMAGES = 6

/**
 * Görseller tarayıcıdan doğrudan Supabase Storage'a gider — dosya bizim
 * sunucumuzdan geçmez. Yazma yetkisini storage politikası verir:
 * yol `<company_id>/...` ile başlamalı ve firma çağırana ait olmalı.
 *
 * Form gönderildiğinde URL'ler gizli input olarak taşınır.
 */
export function ImageUploader({
  companyId,
  initial = [],
  name = 'images',
}: {
  companyId: string
  initial?: string[]
  name?: string
}) {
  const t = useTranslations('form')
  const [urls, setUrls] = useState<string[]>(initial)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  async function upload(files: FileList) {
    setError(null)
    const supabase = createClient()
    const accepted: string[] = []

    for (const file of Array.from(files)) {
      if (urls.length + accepted.length >= MAX_IMAGES) {
        setError(t('tooManyImages', { max: MAX_IMAGES }))
        break
      }
      if (file.size > MAX_BYTES) {
        setError(t('imageTooLarge', { name: file.name }))
        continue
      }

      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `${companyId}/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: '31536000', upsert: false })

      if (uploadError) {
        setError(uploadError.message)
        continue
      }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
      accepted.push(data.publicUrl)
    }

    if (accepted.length) setUrls((prev) => [...prev, ...accepted])
  }

  function remove(url: string) {
    setUrls((prev) => prev.filter((u) => u !== url))
  }

  return (
    <div>
      {urls.map((url) => (
        <input key={url} type="hidden" name={name} value={url} />
      ))}

      <div className="flex flex-wrap gap-2.5">
        {urls.map((url, index) => (
          <div
            key={url}
            className="group relative size-24 overflow-hidden rounded-xl border border-line bg-surface-2"
          >
            <Image src={url} alt="" fill sizes="96px" className="object-cover" />
            {index === 0 ? (
              <span className="absolute left-1 top-1 rounded-pill bg-brand px-1.5 py-0.5 text-[9px] font-bold text-white">
                {t('coverImage')}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => remove(url)}
              aria-label={t('removeImage')}
              className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-black/60 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              ×
            </button>
          </div>
        ))}

        {urls.length < MAX_IMAGES ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'grid size-24 place-items-center rounded-xl border-2 border-dashed border-line',
              'text-xs font-semibold text-muted transition-colors',
              'hover:border-brand hover:bg-brand-soft hover:text-brand',
              pending && 'opacity-60'
            )}
          >
            {pending ? '…' : `+ ${t('addImage')}`}
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="sr-only"
        onChange={(e) => {
          const files = e.target.files
          if (files?.length) startTransition(() => void upload(files))
          e.target.value = ''
        }}
      />

      <p className="mt-2 text-[11px] text-muted">
        {t('imageHint', { max: MAX_IMAGES })}
      </p>

      {error ? (
        <Notice tone="danger" className="mt-2">
          {error}
        </Notice>
      ) : null}
    </div>
  )
}
