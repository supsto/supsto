# Yarım kalan işler

Durum: **site işleyebilir durumda.** Tedarikçi ürün yayınlayabiliyor,
alıcı mesaj atabiliyor, admin rozet verebiliyor, teklif → sipariş akışı
uçtan uca çalışıyor.

## Üretime almadan önce (sizin tarafınızda)

- [ ] **Vercel env:** `NEXT_PUBLIC_SITE_URL = https://supsto.vercel.app`
      Eksikken canonical, hreflang ve sitemap URL'leri `localhost` gösterir.
- [ ] **Migration'ları buluta it:** `npx supabase db push`
      (üretimde şu an tablolar boş ve yeni ticaret tabloları yok)
- [ ] **Kategori referans verisi:** `supabase/seed-reference.sql`
      Supabase SQL Editor'e yapıştırın. İdempotenttir.
- [ ] Durumu `https://supsto.vercel.app/api/health` ile doğrulayın.

## Şemada hazır, arayüzü henüz yok

Tablolar, RLS politikaları ve tetikleyiciler kurulu ve test edilmiş
durumda; yalnızca ekranları yazılacak.

- [ ] **Toplu alım havuzu** (`group_buys`, `group_buy_participants`)
      Küçük perakendeciler birleşip MOQ'yu doldurur. Taahhüt toplamı ve
      "hedefe ulaşıldı" durumu tetikleyiciyle tutuluyor, test geçiyor.
      Segmentinizin en büyük tıkanıklığını çözen özellik — sıradaki en
      yüksek değerli iş bu.
- [ ] **Karşı teklif turları** (`quote_revisions`)
      Pazarlık geçmişi saklanıyor; arayüzde tur tur gösterim yok.
- [ ] **Fiyat / stok alarmı** (`product_alerts`)
- [ ] **Ürün görüntülenme analitiği** (`product_view_stats` + `track_product_view` RPC)
      Sayaç RPC'si hazır; ürün sayfasından çağrılmıyor ve tedarikçiye
      grafik gösterilmiyor.
- [ ] **Numune talebi formu** — tedarikçi tarafı (onay/ret/gönderildi)
      bitti; alıcı tarafındaki "numune iste" formu ürün sayfasına
      eklenmedi.

## Tasarladım ama henüz yapmadım

- [ ] **Toplam maliyet hesaplayıcı** — birim × adet + navlun + KDV,
      Incoterm'e göre. Alıcılar bunu bugün Excel'de yapıyor.
- [ ] **Koli/palet birim dönüştürücü** — veri var (`units_per_case`,
      `cases_per_pallet`), ürün sayfasında "10 koli = 2.400 adet"
      gösterimi yok.
- [ ] **Tekrar sipariş** — toptancılıkta iş tekrar eden siparişlerdir;
      geçmiş siparişten tek tıkla yeni talep.
- [ ] **Ürün karşılaştırma tablosu** (MOQ / fiyat / teslim yan yana)
- [ ] **Yorum & puan** — sipariş takibi kurulduğu için artık
      doğrulanmış işleme dayandırılabilir.
- [ ] **Raporlama / moderasyon** akışı

## Diğer

- [ ] **E-posta bildirimleri.** Site içi bildirim çalışıyor; e-posta için
      sağlayıcı hesabı (Resend vb.) gerekiyor. `lib/actions/notification.ts`
      ve DB tetikleyicileri hazır, tek yapılacak gönderim katmanı.
- [ ] **Telefon + OTP girişi.** Kod yazıldı (`lib/auth/actions.ts`),
      Twilio anahtarı bekliyor.
- [ ] **Ürün/firma içeriği çevirisi.** Kategoriler üç dile çevrildi
      (dile özel slug ile). Ürün metinleri kaynak dilinde kalıyor ve
      sayfada dil uyarısı gösteriliyor. Makine çeviri hattı eklenmedi.
- [ ] **Canlı kur.** `exchange_rates` tablosu sabit değerlerle dolu;
      günlük güncelleme işi (cron/Edge Function) yok. Fiyatlar "≈" ile
      gösterilmeli — sözleşme değeri daima ürünün kendi para birimidir.
- [ ] **Firma logosu yükleme.** Ürün görselleri yükleniyor; firma logosu
      için aynı bileşen `company-logos` bucket'ına bağlanacak.

## Küçük / teknik borç

- [ ] `locale-switcher.tsx` içinde bir `@ts-expect-error` (next-intl'in
      bilinen sınırı; kütüphanenin kendi dokümanı da bu cast'i öneriyor).
- [ ] **Tarayıcı testi yapılmadı.** Ortamda tarayıcı yok; doğrulama HTTP
      yanıtları, HTML içeriği ve veritabanı testleri üzerinden yapıldı.
- [ ] Realtime kapalı (`supabase/config.toml`) — mesajlaşma sayfa
      yenilemesiyle çalışıyor, canlı akış yok. Açmak kaynak maliyeti
      getirir; düşük çekirdekli ortamda dikkat.
- [ ] Birim/bileşen testi yok. Güvenlik ve iş kuralı testleri var:
      `npm run db:test` (rls.sql + commerce.sql + api-auth.sh).

## Dikkat: kolay bozulan yerler

- Yeni sayfa eklerken `i18n/routing.ts` içindeki `pathnames` tablosuna
  **üç dilin de** slug'ını yazın; yoksa rota 404 verir.
- Yeni sayfaya `alternates()` eklemeyi unutmayın, yoksa hreflang çıkmaz.
- `next/link` **kullanmayın** — `@/i18n/navigation` içindeki `Link`.
  İstisna: yalnızca `?query` değiştiren bağlantılar.
- Server Action'lar `next/root-params` kullanamaz; dili `getLocale()` ile alın.
- Veritabanına yazılan URL'ler **kanonik** olmalı (`/dashboard/samples`),
  çevrilmiş değil. Gösterirken `localizeNotificationUrl` ile eşleyin.
- Yetki kuralları RLS + tetikleyicilerde. Server Action'daki kontroller
  yalnızca okunur hata mesajı içindir, güvenlik sınırı değildir.
