import { Link } from '@/i18n/navigation'

import { Badge } from '@/components/ui/badge'
import { formatNumber, formatRelative } from '@/lib/utils'
import type { RfqListItem } from '@/lib/types'

export function RfqRow({ rfq }: { rfq: RfqListItem }) {
  const meta = [
    rfq.category?.name,
    rfq.city,
    rfq.quantity ? `${formatNumber(rfq.quantity)} ${rfq.unit ?? ''}`.trim() : null,
  ].filter(Boolean)

  return (
    <Link
      href={{ pathname: '/rfq/[id]', params: { id: rfq.id } }}
      className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-b-0 hover:bg-surface-2"
    >
      <div className="min-w-0">
        <div className="line-clamp-1 text-[13px] font-bold">{rfq.title}</div>
        <div className="mt-0.5 text-[11px] text-muted">{meta.join(' · ')}</div>
      </div>
      <div className="shrink-0 text-right">
        <Badge tone={rfq.quote_count > 0 ? 'warning' : 'neutral'}>
          {rfq.quote_count} teklif
        </Badge>
        <div className="mt-1 text-[10px] text-faint">{formatRelative(rfq.created_at)}</div>
      </div>
    </Link>
  )
}
