import { Table, Td, Th, TableWrap } from '@/components/ui/table'
import { formatCurrency, formatNumber } from '@/lib/utils'
import type { PriceTier } from '@/lib/types'

export function PriceTierTable({
  tiers,
  unit = 'adet',
  highlightQuantity,
}: {
  tiers: PriceTier[]
  unit?: string | null
  highlightQuantity?: number
}) {
  if (tiers.length === 0) return null

  return (
    <TableWrap className="rounded-card border border-line">
      <Table>
        <thead>
          <tr>
            <Th>Miktar</Th>
            <Th className="text-right">Birim fiyat</Th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((tier) => {
            const active =
              highlightQuantity !== undefined &&
              highlightQuantity >= tier.min_quantity &&
              (tier.max_quantity === null || highlightQuantity <= tier.max_quantity)

            return (
              <tr key={tier.id} className={active ? 'bg-brand-soft' : undefined}>
                <Td className="border-b-0">
                  {formatNumber(tier.min_quantity)}
                  {tier.max_quantity
                    ? ` – ${formatNumber(tier.max_quantity)}`
                    : '+'}{' '}
                  {unit}
                </Td>
                <Td className="border-b-0 text-right font-bold tabular-nums">
                  {formatCurrency(tier.unit_price, tier.currency)}
                </Td>
              </tr>
            )
          })}
        </tbody>
      </Table>
    </TableWrap>
  )
}
