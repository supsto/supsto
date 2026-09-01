import type { ZodError } from 'zod'

import type { ActionState } from '@/lib/types'

/** Zod hatalarını alan adı → mesaj sözlüğüne indirger. */
export function toFieldErrors(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.')
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return fieldErrors
}

export function invalid(error: ZodError, message = 'Formda eksik veya hatalı alanlar var.'): ActionState {
  return { status: 'error', message, fieldErrors: toFieldErrors(error) }
}

export function failure(message: string): ActionState {
  return { status: 'error', message }
}

/** Boş string'i undefined'a çevirir — opsiyonel form alanları için. */
export function emptyToUndefined(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}
