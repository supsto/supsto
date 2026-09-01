# Yarım kalan işler

Durum: **Faz 1 (keşif + RFQ) ve çok dilli altyapı tamam.** Aşağıdakiler
bilinçli olarak sonraya bırakıldı.

## Yüksek öncelik

- [ ] **Ürün/firma içeriği çevirisi.** Kategoriler üç dile çevrildi
      (dile özel slug ile). Ürün ve firma metinleri kaynak dilinde kalıyor;
      sayfada "bu içerik Türkçe yayınlandı" uyarısı gösteriliyor.
      `products.content_language` / `companies.content_language` kolonları
      hazır. Sonraki adım: `product_translations` tablosu + makine çeviri
      hattı (DeepL/Claude). Bunsuz `/en` ve `/ru` ürün sayfaları İngilizce/
      Rusça aramada sıralanmaz.
- [ ] **Tedarikçi paneli.** Ürün CRUD, kademeli fiyat yönetimi, stok
      güncelleme, "tekliflerim" ekranı. Şu an tedarikçi katalog giremiyor.
- [ ] **Telefon + OTP girişi.** Kod yazıldı (`lib/auth/actions.ts`:
      `sendPhoneOtp` / `verifyPhoneOtp`) ama kapalı. Açmak için
      `supabase/config.toml` içinde `[auth.sms]` + bir SMS sağlayıcı
      (Twilio) kimlik bilgisi gerekiyor.

## Orta öncelik

- [ ] **Mesajlaşma.** `conversations` / `messages` tabloları ve RLS
      politikaları hazır; arayüz yok.
- [ ] **Bildirimler.** `notifications` tablosu hazır; üreten tetikleyici ve
      arayüz yok. (Tabloda bilerek INSERT politikası yok — yalnızca sunucu
      üretir.)
- [ ] **Favoriler.** `favorites` tablosu ve RLS hazır; arayüz yok.
- [ ] **Admin ekranları.** Firma doğrulama merkezi, kullanıcı/ürün/RFQ
      yönetimi, moderasyon. `is_admin()` ve tüm politikalar hazır.
- [ ] **Toplu import.** Excel/CSV ile ürün aktarımı.
- [ ] **Görsel yükleme.** Storage bucket'ları ve RLS politikaları hazır
      (`company-logos`, `product-images`, `rfq-attachments`); yükleme
      arayüzü yok. Şu an SVG yer tutucular kullanılıyor.

## Küçük / teknik borç

- [ ] **`locale-switcher.tsx` içinde bir `@ts-expect-error`.** next-intl'in
      bilinen sınırı: çalışma anındaki `pathname` birleşim tipi ile `params`
      statik olarak eşleştirilemiyor. Kütüphanenin kendi dokümanı da bu
      cast'i öneriyor.
- [ ] **Tarayıcı testi yapılmadı.** Ortamda tarayıcı yok; doğrulama HTTP
      yanıtları ve HTML içeriği üzerinden yapıldı. Görsel regresyon testi
      (Playwright) kurulmadı.
- [ ] **`quotes.status` gibi alanlar CHECK'li `text`.** Üretilen tip
      `string` oluyor; arayüzde bilinmeyen değere karşı korumalı eşleme var.
      Postgres enum'a geçilebilir.
- [ ] **RFQ dosya ekleri.** `rfqs.attachments` kolonu ve storage politikası
      var; form dosya yüklemiyor.
- [ ] **Birim testi yok.** Güvenlik testleri var
      (`supabase/tests/rls.sql` + `api-auth.sh`, `npm run db:test`),
      bileşen/birim testi yok.

## Dikkat: kolay bozulan yerler

- Yeni sayfa eklerken `i18n/routing.ts` içindeki `pathnames` tablosuna
  **üç dilin de** slug'ını yazın; yoksa rota 404 verir.
- Yeni sayfaya `alternates()` eklemeyi unutmayın, yoksa hreflang çıkmaz.
- `next/link` **kullanmayın** — `@/i18n/navigation` içindeki `Link`.
  İstisna: yalnızca `?query` değiştiren bağlantılar (sayfalama, filtre).
- Server Action'lar `next/root-params` kullanamaz; dili
  `getLocale()` ile alın.
