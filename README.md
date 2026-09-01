# Supsto

B2B ticaret platformu — ürün kataloğu, gerçek stok, MOQ, kademeli fiyat,
saha doğrulaması ve RFQ (teklif talebi) süreçleri.

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind CSS v4 · Supabase
· next-intl (tr / en / ru)

Dağıtım için [DEPLOYMENT.md](DEPLOYMENT.md), yarım kalan işler için
[TODO.md](TODO.md).

---

## ⚠️ Düşük çekirdekli ortamlarda (Codespaces) önce bunu okuyun

`supabase start` varsayılan olarak **11 konteyner** ayağa kaldırır. 2 çekirdekli
bir Codespace'te bu load average'ı ~17'ye çıkarır ve **makineyi kilitler**
(“Stopping codespace” ekranında donma).

`supabase/config.toml` içinde ağır ve Faz 1'de kullanılmayan servisler
kapatılmıştır:

| Servis | Durum | Neden |
| --- | --- | --- |
| `studio` | kapalı | Ayrı bir Next.js uygulaması, en pahalı bileşen |
| `analytics` | kapalı | Logflare + Vector, sürekli CPU yer |
| `realtime` | kapalı | Elixir; Faz 1'de canlı abonelik yok |
| `edge_runtime` | kapalı | Deno; edge function yazmıyoruz |

Geriye `db`, `api` (PostgREST), `auth` (GoTrue), `storage` ve `mailpit` kalır.

Veritabanına göz atmak için Studio yerine `psql` kullanın:

```bash
docker exec -it supabase_db_supsto psql -U postgres -d postgres
```

Studio'ya gerçekten ihtiyaç duyarsanız `config.toml` içinde açın, **işiniz
bitince kapatın**. Ve çalışmayı bıraktığınızda daima:

```bash
npm run db:stop
```

---

## Kurulum

```bash
npm install
cp .env.example .env.local
npm run db:start      # Supabase (ilk çalıştırmada imajları indirir, uzun sürer)
```

`db:start` çıktısındaki `ANON_KEY` ve `SERVICE_ROLE_KEY` değerlerini
`.env.local` içine yazın, sonra:

```bash
npm run dev
```

→ http://localhost:3000

### Demo hesaplar

`supabase/seed.sql` her `db:reset` sonrası uygulanır.
Tümünün parolası: **`supsto123`**

| E-posta | Rol |
| --- | --- |
| `admin@supsto.local` | admin |
| `alici@supsto.local` | alıcı |
| `nova@supsto.local` | tedarikçi (NOVA KUTU) |
| `voltrix@supsto.local` | tedarikçi (VOLTRIX) |
| `mavera@supsto.local` | tedarikçi (MAVERA TEXTILE) |
| `polybox@supsto.local` | tedarikçi (POLYBOX) |

Doğrulama e-postaları Mailpit'e düşer: http://127.0.0.1:54324

## Komutlar

| Komut | Açıklama |
| --- | --- |
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Üretim derlemesi |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:start` / `db:stop` | Supabase yığını |
| `npm run db:reset` | Migration + seed'i sıfırdan uygula |
| `npm run db:types` | Şemadan TypeScript tiplerini üret |
| `npm run db:test` | Yetki testleri (psql + gerçek API yolu) |

## Mimari

```
app/                 Rotalar (Türkçe URL'ler: /urun, /tedarikci, /rfq …)
components/ui/       Tasarım sistemi (Button, Card, Badge, Field …)
components/layout/   Header, footer, navigasyon
components/domain/   Ürün kartı, fiyat kademesi tablosu, RFQ satırı …
lib/supabase/        client (tarayıcı) · server (RSC) · admin (service role) · proxy
lib/queries/         Veri erişimi — sayfalar doğrudan Supabase çağırmaz
lib/types/           database.ts üretilmiştir; index.ts alan tipleri
i18n/                routing.ts (dil + çevrilmiş yollar) · navigation · request
messages/            tr.json · en.json · ru.json
proxy.ts             Oturum tazeleme + rota koruması
supabase/migrations/ Şema
supabase/tests/      rls.sql (psql) + api-auth.sh (HTTP+JWT+PostgREST)
```

## Çok dillilik

URL'ler tamamen çevrilidir: `/tr/iletisim` · `/en/contact` · `/ru/kontakty`.
Dosya sistemi kanonik İngilizce adları kullanır (`app/[locale]/contact`);
`proxy.ts` gelen çevrilmiş yolu buna yeniden yazar, adres çubuğu değişmez.

- Yeni rota eklerken `i18n/routing.ts` içindeki `pathnames` tablosuna
  **üç dilin de** slug'ını ekleyin.
- Sayfaya `alternates()` (bkz. `lib/seo.ts`) ekleyin — hreflang bundan üretilir.
- Bağlantılarda `next/link` değil `@/i18n/navigation` içindeki `Link`
  kullanın. İstisna: yalnızca `?query` değiştiren bağlantılar.
- Kategoriler dile özel slug'a sahiptir (`/en/category/packaging`);
  ürün ve firma metinleri kaynak dilinde kalır ve sayfada dil uyarısı çıkar.

### Dikkat edilmesi gerekenler

- **Next.js 16'da `middleware.ts` yoktur** — dosya `proxy.ts`, export edilen
  fonksiyon `proxy`. Supabase dokümanlarındaki `middleware.ts` örneğini
  birebir kopyalamayın.
- `params` ve `searchParams` **Promise**'tir; `await` edilmeden okunamaz.
- Yetki kararlarında `getSession()` değil **`getUser()`** kullanın; ilki
  çerezdeki veriye güvenir.
- Veri okuma/yazma yetkisinin tek kaynağı **RLS**'tir. Politikalara güvenilen
  davranışları `supabase/tests/rls.sql` içine test olarak ekleyin.
- `role`, `companies.verified` ve `quotes.price` gibi alanlar RLS'e ek olarak
  **tetikleyicilerle** korunur. Bu tetikleyiciler bilerek `SECURITY DEFINER`
  *değildir* — definer bağlamında `current_user` fonksiyon sahibine döner ve
  koruma tümüyle devre dışı kalır.
- Teklif **sayısı** herkese açık (`rfqs.quote_count`, tetikleyiciyle güncel
  tutulur), teklif **içeriği** RLS ile gizli. `quotes(count)` ile saymayın —
  RLS satırları gizlediği için anonim ziyaretçiye hep 0 döner.
- `auth.users`'a seed ile kullanıcı eklerken `confirmation_token` ve
  kardeş token kolonlarını `''` yapın; NULL bırakılırsa GoTrue girişte
  "converting NULL to string is unsupported" hatası verir.
