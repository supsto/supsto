import 'server-only'

import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Liste sorgularının hatası sayfayı ÇÖKERTMEMELİ.
 *
 * Boş sonuç bu uygulamada geçerli bir durumdur (her liste için EmptyState
 * var). Hatayı yukarı fırlatmak, tek bir bölümün başarısızlığını tüm
 * sayfanın 500'üne dönüştürüyordu — örneğin şema henüz uygulanmamış bir
 * veritabanında ana sayfa tamamen açılmıyordu.
 *
 * Hata yutulmaz: sunucu günlüğüne bağlamıyla yazılır (Vercel > Logs).
 */
export function softFail<T>(context: string, error: PostgrestError | null, fallback: T): T {
  if (error) {
    console.error(
      `[supsto] ${context} sorgusu başarısız: ${error.code ?? '?'} ${error.message}`,
      error.details ? `— ${error.details}` : ''
    )
  }
  return fallback
}
