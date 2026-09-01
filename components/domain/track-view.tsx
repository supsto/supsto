'use client'

import { useEffect, useRef } from 'react'

import { createClient } from '@/lib/supabase/client'

/**
 * Ürün görüntülenmesini sayar. Sunucuda değil istemcide çağrılır:
 * sunucu render'ı önbelleğe alınabildiği ve prefetch/bot isteklerini de
 * sayacağı için görüntülenme sayısı şişerdi.
 *
 * Yazma yetkisi RPC'de (SECURITY DEFINER); tabloya doğrudan erişim yok.
 */
export function TrackView({ productId }: { productId: string }) {
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    sent.current = true

    // Sekmeyi hemen kapatanı saymamak için kısa bekleme.
    const timer = setTimeout(() => {
      void createClient().rpc('track_product_view', { p_product_id: productId })
    }, 2000)

    return () => clearTimeout(timer)
  }, [productId])

  return null
}
