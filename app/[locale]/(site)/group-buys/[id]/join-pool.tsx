'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { Button, ButtonLink } from '@/components/ui/button'
import { Card, CardBody, CardHead } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/field'
import { FormMessage, SubmitButton } from '@/components/ui/form-status'
import { joinGroupBuy, leaveGroupBuy } from '@/lib/actions/group-buy'
import { IDLE } from '@/lib/types'

export function JoinPool({
  poolId,
  signedIn,
  currentQuantity,
  unit,
}: {
  poolId: string
  signedIn: boolean
  currentQuantity: number | null
  unit: string | null
}) {
  const t = useTranslations('groupBuy')
  const [state, action] = useActionState(joinGroupBuy, IDLE)

  if (!signedIn) {
    return (
      <ButtonLink href="/login" variant="primary" className="w-full">
        {t('join')}
      </ButtonLink>
    )
  }

  return (
    <Card>
      <CardHead title={currentQuantity ? t('yourCommitment') : t('join')} />
      <CardBody className="pt-0">
        <form action={action}>
          <FormMessage state={state} />
          <input type="hidden" name="group_buy_id" value={poolId} />
          <Field label={`${t('quantity')} (${unit ?? ''})`} htmlFor="quantity" required>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              min={1}
              required
              defaultValue={currentQuantity ?? ''}
            />
          </Field>
          <SubmitButton className="mt-3 w-full">{t('join')}</SubmitButton>
        </form>

        {currentQuantity ? (
          <form action={leaveGroupBuy} className="mt-2">
            <input type="hidden" name="group_buy_id" value={poolId} />
            <Button type="submit" variant="danger" size="sm" className="w-full">
              {t('leave')}
            </Button>
          </form>
        ) : null}
      </CardBody>
    </Card>
  )
}
