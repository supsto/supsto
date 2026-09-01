# Durum ve kalan işler

**Faz 1–3 tamamlandı.** Site yerelde uçtan uca çalışıyor: tedarikçi ürün
yayınlıyor, alıcı mesajlaşıyor ve pazarlık ediyor, teklif siparişe
dönüşüyor, sipariş tamamlanınca doğrulanmış değerlendirme yazılabiliyor,
admin rozet veriyor ve moderasyon yapıyor.

## Üretime almadan önce (sizin tarafınızda)

- [ ] **Vercel env:** `NEXT_PUBLIC_SITE_URL = https://supsto.vercel.app`
      Eksikken canonical, hreflang ve sitemap URL'leri `localhost` gösterir.
- [ ] **Migration'ları buluta it:** `npx supabase db push`
      Yerelde **sekiz** migration var; üretimde yalnızca ilk üçü uygulanmış
      olabilir. Ticaret çekirdeği (siparişler, numune, sertifika, çoklu
      para birimi), büyüme özellikleri (havuz, alarm, import, analitik) ve
      yorum/moderasyon şeması bu adım olmadan üretimde yok.
- [ ] **Kategori referans verisi:** `supabase/seed-reference.sql`
      Supabase SQL Editor'e yapıştırın. İdempotenttir.
- [ ] Doğrulama: `https://supsto.vercel.app/api/health` → `healthy: true`

## Yapılmadı — bilinçli kararlar

- [ ] **E-posta bildirimleri.** Site içi bildirim çalışıyor (zil + liste +
      okundu). E-posta için sağlayıcı hesabı (Resend vb.) gerekiyor;
      tetikleyiciler ve `notify()` yardımcısı hazır, tek eksik gönderim
      katmanı.
- [ ] **Telefon + OTP girişi.** Kod yazıldı (`lib/auth/actions.ts`),
      Twilio anahtarı bekliyor.
- [ ] **Ürün/firma içeriği makine çevirisi.** Kategoriler üç dile çevrildi
      (dile özel slug ile). Ürün metinleri kaynak dilinde kalıyor ve
      sayfada "bu içerik X dilinde yayınlandı" uyarısı gösteriliyor.
      `content_language` kolonları hazır; çeviri hattı eklenmedi.
- [ ] **Canlı kur.** `exchange_rates` sabit değerlerle dolu ve fiyatlar
      "≈" ile gösteriliyor. Günlük güncelleme işi (cron / Edge Function)
      yok. Sözleşme değeri daima ürünün kendi para birimidir.
- [ ] **Fiyat/stok alarmı tetikleyicisi.** Kullanıcı alarm kurabiliyor ve
      listeleyebiliyor; fiyat düştüğünde/stok geldiğinde bildirim üreten
      arka plan işi yazılmadı. Şema (`product_alerts`) hazır.
- [ ] **Havuz → sipariş bağlantısı.** Havuz hedefe ulaştığında durum
      `reached` oluyor; oradan tedarikçiyle toplu sipariş açma akışı
      manuel (mesajlaşma üzerinden). Otomatik RFQ üretimi eklenebilir.
- [ ] **Realtime.** Mesajlaşma sayfa yenilemesiyle çalışıyor; canlı akış
      kapalı (`supabase/config.toml`). Açmak düşük çekirdekli ortamda
      kaynak maliyeti getirir.

## Teknik borç

- [ ] `locale-switcher.tsx` içinde bir `@ts-expect-error` — next-intl'in
      bilinen sınırı; kütüphanenin kendi dokümanı da bu cast'i öneriyor.
- [ ] **Tarayıcı testi yapılmadı.** Ortamda tarayıcı yok; doğrulama HTTP
      yanıtları, HTML içeriği ve veritabanı testleri üzerinden yapıldı.
      Görsel regresyon testi (Playwright) kurulmadı.
- [ ] Birim/bileşen testi yok. Var olanlar: `npm run db:test` (RLS
      politikaları + ticaret kuralları + gerçek API yolu) ve
      `npm run check:i18n` (çeviri anahtarı denetimi).
- [ ] CSV import tarayıcıda ayrıştırılıyor; çok büyük dosyalarda
      (>10 bin satır) sunucu tarafı akış işleme gerekebilir.

## Kolay bozulan yerler

- Yeni sayfa eklerken `i18n/routing.ts` içindeki `pathnames` tablosuna
  **üç dilin de** slug'ını yazın; yoksa rota 404 verir.
- Yeni sayfaya `alternates()` eklemeyi unutmayın, yoksa hreflang çıkmaz.
- Yeni **istemci** bileşeni `useTranslations('x')` çağırırsa `'x'`
  `app/[locale]/layout.tsx` içindeki `CLIENT_NAMESPACES` listesine
  eklenmeli; yoksa çalışma anında "namespace bulunamadı" hatası verir.
  `npm run check:i18n` eksik anahtarları yakalar.
- `next/link` **kullanmayın** — `@/i18n/navigation` içindeki `Link`.
  İstisna: yalnızca `?query` değiştiren bağlantılar.
- Server Action'lar `next/root-params` kullanamaz; dili `getLocale()` ile alın.
- Veritabanına yazılan URL'ler **kanonik** olmalı (`/dashboard/samples`),
  çevrilmiş değil. Gösterirken `localizeNotificationUrl` ile eşleyin.
- **Yetki kuralları RLS ve tetikleyicilerdedir.** Server Action'daki
  kontroller yalnızca okunur hata mesajı içindir, güvenlik sınırı değil.
- Testlerde **sabit sayı beklemeyin** (seed büyüdükçe bayatlıyor);
  görünürlük kuralına göre karşılaştırın.

## Ana sayfa brief'inde olup bilerek kurulmayanlar (2026-09-01)

Aşağıdakiler teknik zorluktan değil, **arkalarında gerçek veri veya
gerçek anlaşma olmadığı için** kurulmadı. Her biri sitede yazsaydı
ziyaretçiye yanlış bilgi vermiş olurduk.

| Brief'teki öğe | Neden kurulmadı | Gerçek olması için gereken |
|---|---|---|
| "Ticaret Bakanlığı destekli" ibaresi | Böyle bir anlaşma yok | Resmî protokol/yazı |
| Canlı emtia fiyatları (HRC çelik, Ege pamuk) | Fiyat kaynağı yok | Ücretli emtia veri aboneliği (ör. TradingEconomics, LME) |
| İskenderun liman bekleme süresi | Veri kaynağı yok | Liman/nakliye API'si |
| "₺482M escrow hacmi" | Hiç escrow işlemi yok; uydurma sayı | Gerçek işlem hacmi birikince otomatik hesaplanır |
| Escrow / BNPL / 90 gün vadeli ödeme | Ödeme kuruluşu entegrasyonu yok | Lisanslı ödeme/emanet sağlayıcı sözleşmesi |
| SGS/BV bağımsız denetim rozeti | Denetim yaptırılmadı | Denetim firmasıyla anlaşma + rapor akışı |
| VR fabrika turu | İçerik yok (alan `factory_tour_url` hazır) | Üreticilerden 360° tur bağlantısı toplamak |
| Görselle eşleşen ürün arama (AI) | Model/altyapı yok | Görsel embedding servisi + pgvector |
| CAD dosyası yükleyip eşleştirme | Parça eşleştirme motoru yok | CAD parser + geometrik benzerlik servisi |
| Almanca / Arapça dil | Çeviri yapılmadı | 3 katalogun tam çevirisi (~1.400 anahtar) |

Kurulan karşılıkları: gösterge döviz kurları (`exchange_rates`,
"gösterge" olarak etiketli), sayılabilir platform metrikleri
(MarketTicker), GTİP/vergi no ile akıllı arama, doğrulanmış üretici
kartlarında yalnızca dolu alanların gösterilmesi.
