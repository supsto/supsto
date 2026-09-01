'use server'

import { revalidatePath } from 'next/cache'

import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

type Target =
  | { kind: 'product'; id: string }
  | { kind: 'company'; id: string }
  | { kind: 'rfq'; id: string }

function readTarget(formData: FormData): Target | null {
  const product = formData.get('product_id')
  if (typeof product === 'string' && product) return { kind: 'product', id: product }
  const company = formData.get('company_id')
  if (typeof company === 'string' && company) return { kind: 'company', id: company }
  const rfq = formData.get('rfq_id')
  if (typeof rfq === 'string' && rfq) return { kind: 'rfq', id: rfq }
  return null
}

/**
 * Favoriye ekler ya da çıkarır. Hedef tam olarak biri olabilir
 * (ürün / firma / RFQ); veritabanı kısıtı da bunu zorlar.
 */
export async function toggleFavorite(formData: FormData) {
  const user = await getCurrentUser()
  if (!user) return

  const target = readTarget(formData)
  if (!target) return

  const column =
    target.kind === 'product' ? 'product_id'
    : target.kind === 'company' ? 'company_id'
    : 'rfq_id'

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq(column, target.id)
    .maybeSingle()

  if (existing) {
    await supabase.from('favorites').delete().eq('id', existing.id)
  } else {
    await supabase.from('favorites').insert(
      target.kind === 'product'
        ? { user_id: user.id, product_id: target.id }
        : target.kind === 'company'
          ? { user_id: user.id, company_id: target.id }
          : { user_id: user.id, rfq_id: target.id }
    )
  }

  revalidatePath('/', 'layout')
}
