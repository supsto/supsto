import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import type { Database } from '@/lib/types/database'
import { supabaseAnonKey, supabaseServerUrl } from './env'

/**
 * Server Component / Server Action / Route Handler istemcisi.
 * Next 16'da `cookies()` asenkrondur.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(supabaseServerUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server Component'ten çağrıldığında cookie yazılamaz; oturum
          // yenilemesi proxy.ts tarafından yapıldığı için bu güvenli.
        }
      },
    },
  })
}
