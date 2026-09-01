'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHead } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/field'
import { FormMessage } from '@/components/ui/form-status'
import { Table, TableWrap, Td, Th } from '@/components/ui/table'
import { addPriceTier, deletePriceTier } from '@/lib/actions/product'
import { IDLE, type PriceTier } from '@/lib/types'
import { formatCurrency, formatNumber } from '@/lib/utils'

export function PriceTierEditor({
  productId,
  currency,
  unit,
  tiers,
}: {
  productId: string
  currency: string
  unit: string | null
  tiers: PriceTier[]
}) {
  const t = useTranslations('form')
  const [state, action] = useActionState(addPriceTier, IDLE)
  const errors = state.status === 'error' ? (state.fieldErrors ?? {}) : {}

  return (
    <Card>
      <CardHead title={t('priceTiers')} subtitle={t('priceTiersHint')} />
      <CardBody className="pt-0">
        {tiers.length > 0 ? (
          <TableWrap className="mb-4 rounded-card border border-line">
            <Table>
              <thead>
                <tr>
                  <Th>{t('minQty')}</Th>
                  <Th>{t('maxQty')}</Th>
                  <Th className="text-right">{t('unitPrice')}</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {tiers.map((tier) => (
                  <tr key={tier.id}>
                    <Td className="border-b-0 tabular-nums">
                      {formatNumber(tier.min_quantity)} {unit}
                    </Td>
                    <Td className="border-b-0 tabular-nums">
                      {tier.max_quantity ? formatNumber(tier.max_quantity) : '∞'}
                    </Td>
                    <Td className="border-b-0 text-right font-bold tabular-nums">
                      {formatCurrency(tier.unit_price, tier.currency)}
                    </Td>
                    <Td className="border-b-0 text-right">
                      <form action={deletePriceTier}>
                        <input type="hidden" name="id" value={tier.id} />
                        <Button type="submit" size="sm" variant="danger">
                          {t('delete')}
                        </Button>
                      </form>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        ) : null}

        <form action={action} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <FormMessage state={state} />
          <input type="hidden" name="product_id" value={productId} />
          <input type="hidden" name="currency" value={currency} />

          <Field label={t('minQty')} htmlFor="min_quantity" required error={errors.min_quantity}>
            <Input id="min_quantity" name="min_quantity" type="number" min={1} required />
          </Field>
          <Field label={t('maxQty')} htmlFor="max_quantity" error={errors.max_quantity}>
            <Input id="max_quantity" name="max_quantity" type="number" min={1} />
          </Field>
          <Field label={`${t('unitPrice')} (${currency})`} htmlFor="unit_price" required error={errors.unit_price}>
            <Input id="unit_price" name="unit_price" type="number" min={0} step="0.01" required />
          </Field>
          <Button type="submit" variant="primary">{t('addTier')}</Button>
        </form>
      </CardBody>
    </Card>
  )
}
