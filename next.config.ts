import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from 'next'

/** Supabase Storage'ın public objelerini next/image ile servis edebilmek için. */
function supabaseImagePattern() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!raw) return []
  try {
    const url = new URL(raw)
    return [
      {
        protocol: url.protocol.replace(':', '') as 'http' | 'https',
        hostname: url.hostname,
        port: url.port || undefined,
        pathname: '/storage/v1/object/public/**',
      },
    ]
  } catch {
    return []
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseImagePattern(),
  },
  // typedRoutes kapalı: rotalar artık next-intl'in `pathnames` tablosundan
  // üretiliyor ve `@/i18n/navigation` içindeki Link/redirect bu tabloya karşı
  // tip denetimi yapıyor. İkisi açıkken çevrilmiş yollar için çakışıyorlar.
  typedRoutes: false,
}

export default createNextIntlPlugin('./i18n/request.ts')(nextConfig)
