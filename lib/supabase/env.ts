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
 * toplanırken patlardı — yani ortam değişkenleri henüz tanımlı olmayan
 * bir platformda ilk dağıtım hiç derlenemezdi. Bu haliyle derleme geçer,
 * hata ilk gerçek istekte net mesajla yüzeye çıkar.
 */
export const supabaseUrl = () => required('NEXT_PUBLIC_SUPABASE_URL')
export const supabaseAnonKey = () => required('NEXT_PUBLIC_SUPABASE_ANON_KEY')
