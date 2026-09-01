import { getTranslations } from 'next-intl/server'

import { Badge } from '@/components/ui/badge'
import { formatNumber, stockLevel } from '@/lib/utils'

export async function StockBadge({
  quantity,
  showCount = false,
}: {
  quantity: number
  showCount?: boolean
}) {
  const t = await getTranslations('stock')
  const level = stockLevel(quantity)

  return (
    <Badge tone={level.tone}>
      {t(level.key)}
      {showCount && quantity > 0 ? ` · ${formatNumber(quantity)}` : null}
    </Badge>
  )
}
