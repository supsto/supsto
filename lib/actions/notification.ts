'use server'

import { revalidatePath } from 'next/cache'

import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function markAllNotificationsRead() {
  const user = await getCurrentUser()
  if (!user) return

  const supabase = await createClient()
  // RLS zaten kullanıcıyı kendi satırlarına kısıtlar.
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null)

  revalidatePath('/', 'layout')
}

export async function markNotificationRead(formData: FormData) {
  const id = formData.get('id')
  if (typeof id !== 'string') return

  const supabase = await createClient()
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)

  revalidatePath('/', 'layout')
}
