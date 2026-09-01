import 'server-only'

import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/types/database'
import { supabaseServerUrl } from './env'

/**
 * RLS'i baypas eder. Yalnızca sunucuda, kullanıcı girdisiyle doğrudan
 * yönlendirilmeyen işler için kullanın (bildirim üretimi, toplu import,
 * admin bakım görevleri).
 */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY tanımlı değil.')
  }

  return createClient<Database>(supabaseServerUrl(), serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
