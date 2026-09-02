'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { Field, Input, Textarea } from '@/components/ui/field'
import { FormMessage, SubmitButton } from '@/components/ui/form-status'
import { createTemplate } from '@/lib/actions/templates'
import { IDLE } from '@/lib/types'

export function TemplateForm() {
  const t = useTranslations('templates')
  const [state, action] = useActionState(createTemplate, IDLE)
  const errors = state.status === 'error' ? (state.fieldErrors ?? {}) : {}

  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      <Field label={t('fName')} htmlFor="tname" required error={errors.name}>
        <Input
          id="tname"
          name="name"
          required
          maxLength={120}
          placeholder={t('fNamePlaceholder')}
        />
      </Field>
      <Field
        label={t('fRepeat')}
        htmlFor="trepeat"
        error={errors.repeat_days}
        hint={t('fRepeatHint')}
      >
        <Input id="trepeat" name="repeat_days" type="number" min={1} max={365} />
      </Field>
      <Field label={t('fNote')} htmlFor="tnote">
        <Textarea id="tnote" name="note" rows={2} maxLength={500} />
      </Field>
      <SubmitButton>{t('create')}</SubmitButton>
    </form>
  )
}
