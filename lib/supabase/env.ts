function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `${name} tanımlı değil. Yerelde .env.example dosyasını .env.local olarak ` +
        `kopyalayıp doldurun; Vercel'de Project Settings > Environment Variables.`
    )
  }
  return value
}

/**
 * Değerler ÇAĞRI ANINDA okunur, modül yüklenirken değil.
 *
 * Modül seviyesinde okunsaydı `next build` sırasında sayfa verisi
 * toplanırken patlardı — ortam değişkenleri henüz tanımlı olmayan bir
 * platformda ilk dağıtım hiç derlenemezdi.
 */

/** Tarayıcının kullanacağı adres — herkese açık olmalı. */
export const supabaseUrl = () => required('NEXT_PUBLIC_SUPABASE_URL')

/**
 * SUNUCUNUN kullanacağı adres.
 *
 * Codespaces gibi ortamlarda tarayıcı adresi (iletilen HTTPS tüneli)
 * ile sunucu adresi (konteyner içi 127.0.0.1) FARKLIDIR. Sunucu tünelden
 * geçmeye kalkarsa GitHub'ın "Connecting to the forwarded port…" HTML
 * sayfasını alır ve her sorgu sessizce başarısız olur.
 *
 * Tanımlı değilse genel adrese düşer — tek adresli ortamlarda (Vercel,
 * düz localhost) doğru davranış budur.
 */
export const supabaseServerUrl = () =>
  process.env.SUPABASE_INTERNAL_URL || required('NEXT_PUBLIC_SUPABASE_URL')

export const supabaseAnonKey = () => required('NEXT_PUBLIC_SUPABASE_ANON_KEY')
