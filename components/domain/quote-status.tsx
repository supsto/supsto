import { getTranslations } from 'next-intl/server'

import { Badge, type Tone } from '@/components/ui/badge'

/**
 * `quotes.status` veritabanında CHECK kısıtlı bir `text` kolonu, bu yüzden
 * üretilen tip `string`. Bilinmeyen bir değer gelirse çökmek yerine ham
 * değeri nötr tonda göster.
 */
const TONES: Record<string, Tone> = {
  pending: 'warning',
  accepted: 'success',
  rejected: 'danger',
}

export async function QuoteStatusBadge({ status }: { status: string }) {
  const t = await getTranslations('rfq')
  const tone = TONES[status]

  if (!tone) return <Badge tone="neutral">{status}</Badge>
  return <Badge tone={tone}>{t(status as 'pending' | 'accepted' | 'rejected')}</Badge>
}
