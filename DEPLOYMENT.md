# Dağıtım (Vercel)

## 1. Cloud Supabase projesi

Yereldeki Supabase (`127.0.0.1:54321`) üretimde çalışmaz. Önce
[supabase.com](https://supabase.com) üzerinde bir proje açın, sonra
migration'ları ve seed'i itin:

```bash
npx supabase link --project-ref <proje-ref>
npx supabase db push          # supabase/migrations/ içindekileri uygular
```

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

## 3. Deploy

Vercel projesi bu GitHub reposuna bağlıysa `main`'e push otomatik üretim
dağıtımı, diğer dallar önizleme dağıtımı üretir.

Bağlı değilse:

```bash
npm i -g vercel
vercel link
vercel --prod
```

## 4. Deploy sonrası kontrol listesi

- [ ] `/` → `/tr` yönlendirmesi çalışıyor
- [ ] `/tr/iletisim`, `/en/contact`, `/ru/kontakty` 200 dönüyor
- [ ] `/robots.txt` ve `/sitemap.xml` **kökten** erişilebiliyor (dile yönlenmemeli)
- [ ] Bir ürün sayfasında `<link rel="alternate" hreflang=...>` etiketleri var
- [ ] Kayıt → e-posta doğrulama → giriş akışı çalışıyor
- [ ] Google Search Console'a üç dilin sitemap'i tanıtıldı
