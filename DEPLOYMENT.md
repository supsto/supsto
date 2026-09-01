# Dağıtım (Vercel)

## 1. Cloud Supabase projesi

Yereldeki Supabase (`127.0.0.1:54321`) üretimde çalışmaz. Önce
[supabase.com](https://supabase.com) üzerinde bir proje açın, sonra
migration'ları ve seed'i itin:

```bash
npx supabase link --project-ref <proje-ref>
npx supabase db push          # supabase/migrations/ içindekileri uygular
```

> Yeni migration eklendiğinde `db push` tekrar çalıştırılmalıdır. Şu an
> altı migration var: init → schema_v2 → rfq_quote_count →
> category_translations → commerce_core → growth_features →
> fix_notification_urls.

> `supabase/seed.sql` demo verisidir (sahte kullanıcı/ürün); üretime **itmeyin**.

Ardından **referans verisini** yükleyin — kategoriler olmadan kategori
sayfaları 404 verir:

```bash
psql "$DATABASE_URL" -f supabase/seed-reference.sql
```

ya da dosyayı Supabase Dashboard > SQL Editor'e yapıştırın. İdempotenttir.

Durumu `https://<alan-adiniz>/api/health` ile doğrulayabilirsiniz —
eksik ortam değişkenlerini ve boş tabloları raporlar.

Ardından Dashboard > Authentication > URL Configuration:

- **Site URL**: `https://<alan-adiniz>`
- **Redirect URLs**: `https://<alan-adiniz>/auth/callback`

## 2. Vercel ortam değişkenleri

Project Settings > Environment Variables (Production + Preview):

| Değişken | Kaynak |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase > Project Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | aynı sayfa (anon / publishable) |
| `SUPABASE_SERVICE_ROLE_KEY` | aynı sayfa — **gizli**, asla `NEXT_PUBLIC_` yapmayın |
| `NEXT_PUBLIC_SITE_URL` | `https://<alan-adiniz>` (sonunda `/` olmadan) |

`NEXT_PUBLIC_SITE_URL` yanlışsa canonical, hreflang ve sitemap URL'leri
`localhost`'u gösterir — SEO açısından kritiktir.

Derleme, ortam değişkenleri tanımlı olmasa da geçer (env okuması tembeldir);
ancak uygulama ilk istekte net bir hata verir. Yani **ilk deploy'dan önce
değişkenleri tanımlayın**.

## 3. İlk yönetici hesabı

Üretim veritabanında hiç kullanıcı yoktur — `supabase/seed.sql` içindeki
demo hesaplar (`admin@supsto.local` vb.) **yalnızca yereldedir** ve
bilerek üretime gitmez.

E-posta doğrulaması açıkken normal kayıt akışı Site URL ayarlanmadan
çalışmaz. En hızlı yol: `supabase/create-admin.sql` dosyasını açın,
başındaki e-posta ve şifreyi değiştirip Supabase Dashboard > SQL
Editor'e yapıştırın. Hesap doğrulanmış olarak oluşur, hemen giriş
yapabilirsiniz. Tekrar çalıştırmak güvenlidir (şifreyi günceller).

## 4. Deploy

Vercel projesi bu GitHub reposuna bağlıysa `main`'e push otomatik üretim
dağıtımı, diğer dallar önizleme dağıtımı üretir.

Bağlı değilse:

```bash
npm i -g vercel
vercel link
vercel --prod
```

## 5. Deploy sonrası kontrol listesi

- [ ] `/` → `/tr` yönlendirmesi çalışıyor
- [ ] `/tr/iletisim`, `/en/contact`, `/ru/kontakty` 200 dönüyor
- [ ] `/robots.txt` ve `/sitemap.xml` **kökten** erişilebiliyor (dile yönlenmemeli)
- [ ] Bir ürün sayfasında `<link rel="alternate" hreflang=...>` etiketleri var
- [ ] Kayıt → e-posta doğrulama → giriş akışı çalışıyor
- [ ] Google Search Console'a üç dilin sitemap'i tanıtıldı

## Üretimin şu anki durumu (ölçüm: 2026-09-01)

Supabase projesi: `uoxwzkgxsbfaszneqefu`. Publishable anahtarla doğrudan
sorgulanarak ölçüldü:

| Göç | Durum |
|---|---|
| `init_schema` | uygulanmış (profiles, companies, categories, products, rfqs, quotes) |
| `090000_schema_v2` ve sonrası | **hiçbiri uygulanmamış** |

Yani price_tiers, messages, notifications, orders, exchange_rates,
group_buys, reviews ve sonradan eklenen kolonlar üretimde yok. Tüm
tablolar 0 satır.

> Not: `api/health` bir süre bu tabloları yanlışlıkla "✓ 0 satır"
> gösteriyordu. Sebebi `head: true` idi — HEAD yanıtının gövdesi
> olmadığından istemci PostgREST'in 404'ünü okuyamıyordu. `limit(0)` ile
> düzeltildi.

### Şemayı uygulama

`init` tabloları zaten var ve `init_schema.sql` `create table` (`if not
exists` değil) kullanıyor; bu yüzden birleşik dosya olduğu gibi çakışır.
Proje 0 satır olduğu için en temizi şemayı sıfırlayıp baştan kurmaktır:

1. Supabase Dashboard > SQL Editor
2. `supabase/full-schema.sql` içeriğini yapıştırın
3. Baştaki `-- drop schema public cascade;` ve `-- create schema public;`
   satırlarını yorumdan çıkarın (auth kullanıcıları ayrı şemadadır,
   etkilenmez)
4. Run

Bu dosya boş bir veritabanında test edildi: 27 tablo, hepsinde RLS açık,
29 kategori. Yeniden üretmek için `npm run db:bundle`.

Alternatif olarak, CLI'ı veritabanına bağlayabiliyorsanız:

```bash
npx supabase link --project-ref uoxwzkgxsbfaszneqefu
npx supabase db push
```

### Vercel ortam değişkenleri

Vercel > Settings > Environment Variables:

| Değişken | Değer |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://uoxwzkgxsbfaszneqefu.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` |
| `NEXT_PUBLIC_SITE_URL` | `https://supsto.vercel.app` |

`NEXT_PUBLIC_SITE_URL` eksik olduğu için doğrulama e-postaları şu an
localhost'a yönleniyor. Ekledikten sonra **yeniden dağıtın** — ortam
değişikliği mevcut dağıtıma uygulanmaz.

Bittiğinde `https://supsto.vercel.app/api/health` `healthy: true`
dönmelidir.
