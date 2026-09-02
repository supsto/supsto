-- ============================================================
-- SUPSTO — birleşik şema (BOŞ veritabanı kurulumu)
--
-- ÜRETİLMİŞ DOSYA. Elle düzenlemeyin. Üretmek için: npm run db:bundle
--
-- KULLANIM: Supabase Dashboard > SQL Editor > yapıştır > Run.
-- Hiçbir düzenleme gerekmez.
--
-- Bu dosya public şemasını silip baştan kurar. Baştaki güvenlik kilidi
-- herhangi bir tabloda tek satır bile bulursa işlemi durdurur; yani dolu
-- bir veritabanında çalışmaz.
--
-- Veri VARSA bu dosyayı kullanmayın: `npx supabase db push` yalnızca
-- eksik göçleri uygular.
-- ============================================================

-- ---------- GÜVENLİK KİLİDİ ----------
do $guard$
declare
  total bigint;
begin
  select coalesce(sum(n), 0) into total
  from (
    select (xpath(
      '/row/c/text()',
      query_to_xml(format('select count(*) as c from public.%I', tablename),
                   false, true, '')
    ))[1]::text::bigint as n
    from pg_tables where schemaname = 'public'
  ) t;

  if total > 0 then
    raise exception
      'public şemasinda % satir var; bu dosya yalnizca BOS veritabani icindir. Eksik gocleri uygulamak icin: npx supabase db push',
      total;
  end if;
end
$guard$;

-- ---------- ŞEMAYI SIFIRLA ----------
-- init göçü `create table` kullanıyor (`if not exists` değil), bu yüzden
-- tabloların bir kısmı zaten varsa dosya çakışır. Yukarıdaki kilit veri
-- olmadığını doğruladı. auth.users AYRI şemadadır, etkilenmez.
drop schema if exists public cascade;
create schema public;
alter schema public owner to pg_database_owner;

-- Supabase'in varsayılan yetkileri şemayla birlikte silinir. Geri
-- verilmezse kurulum başarılı görünür ama `anon` hiçbir tabloyu okuyamaz
-- ve site sessizce boş döner. Tabloları RLS korur, bu yetkiler değil.
grant usage on schema public to public, anon, authenticated, service_role;
grant create on schema public to postgres, service_role;
alter default privileges in schema public
  grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to postgres, anon, authenticated, service_role;


-- ============ 20260830113140_init_schema.sql ============

-- ============================================
-- PROFILES (kullanıcı profili, auth.users'a bağlı)
-- ============================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'buyer' check (role in ('buyer', 'supplier', 'admin')),
  phone text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Herkes profilleri görebilir"
  on profiles for select using (true);

create policy "Kullanıcı kendi profilini günceller"
  on profiles for update using (auth.uid() = id);

create policy "Kullanıcı kendi profilini oluşturur"
  on profiles for insert with check (auth.uid() = id);

-- ============================================
-- COMPANIES (tedarikçi/alıcı firma profili)
-- ============================================
create table companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  logo_url text,
  city text,
  country text default 'Türkiye',
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

alter table companies enable row level security;

create policy "Herkes firmaları görebilir"
  on companies for select using (true);

create policy "Sahibi firmasını yönetir"
  on companies for insert with check (auth.uid() = owner_id);

create policy "Sahibi firmasını günceller"
  on companies for update using (auth.uid() = owner_id);

-- ============================================
-- CATEGORIES
-- ============================================
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references categories(id),
  image_url text,
  created_at timestamptz not null default now()
);

alter table categories enable row level security;

create policy "Herkes kategorileri görebilir"
  on categories for select using (true);

-- ============================================
-- PRODUCTS
-- ============================================
create table products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  category_id uuid references categories(id),
  title text not null,
  slug text not null unique,
  description text,
  price numeric(12,2),
  currency text not null default 'TRY',
  moq integer not null default 1,
  unit text default 'adet',
  images text[] default '{}',
  status text not null default 'active' check (status in ('active', 'passive', 'draft')),
  created_at timestamptz not null default now()
);

alter table products enable row level security;

create policy "Herkes aktif ürünleri görebilir"
  on products for select using (status = 'active');

create policy "Firma sahibi kendi ürününü görebilir"
  on products for select using (
    exists (select 1 from companies c where c.id = company_id and c.owner_id = auth.uid())
  );

create policy "Firma sahibi ürün ekler"
  on products for insert with check (
    exists (select 1 from companies c where c.id = company_id and c.owner_id = auth.uid())
  );

create policy "Firma sahibi ürününü günceller"
  on products for update using (
    exists (select 1 from companies c where c.id = company_id and c.owner_id = auth.uid())
  );

create policy "Firma sahibi ürününü siler"
  on products for delete using (
    exists (select 1 from companies c where c.id = company_id and c.owner_id = auth.uid())
  );

-- ============================================
-- RFQS (Request for Quote - teklif istekleri)
-- ============================================
create table rfqs (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references profiles(id) on delete cascade,
  category_id uuid references categories(id),
  title text not null,
  description text not null,
  quantity integer,
  unit text default 'adet',
  target_price numeric(12,2),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

alter table rfqs enable row level security;

create policy "Herkes açık RFQ'ları görebilir"
  on rfqs for select using (status = 'open');

create policy "Alıcı kendi RFQ'sunu görebilir"
  on rfqs for select using (auth.uid() = buyer_id);

create policy "Alıcı RFQ oluşturur"
  on rfqs for insert with check (auth.uid() = buyer_id);

create policy "Alıcı kendi RFQ'sunu günceller"
  on rfqs for update using (auth.uid() = buyer_id);

-- ============================================
-- QUOTES (tedarikçilerin RFQ'lara verdiği teklifler)
-- ============================================
create table quotes (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references rfqs(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  price numeric(12,2) not null,
  message text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now()
);

alter table quotes enable row level security;

create policy "RFQ sahibi ve teklif veren firma teklifi görebilir"
  on quotes for select using (
    exists (select 1 from rfqs r where r.id = rfq_id and r.buyer_id = auth.uid())
    or exists (select 1 from companies c where c.id = company_id and c.owner_id = auth.uid())
  );

create policy "Firma sahibi teklif verir"
  on quotes for insert with check (
    exists (select 1 from companies c where c.id = company_id and c.owner_id = auth.uid())
  );

create policy "RFQ sahibi teklif durumunu günceller"
  on quotes for update using (
    exists (select 1 from rfqs r where r.id = rfq_id and r.buyer_id = auth.uid())
  );

-- ============ 20260901090000_schema_v2.sql ============
-- ============================================================
-- Supsto şema v2
--   1. Yardımcı fonksiyonlar (is_admin, updated_at, korumalı kolonlar)
--   2. Mevcut tabloların genişletilmesi
--   3. Yeni tablolar (price_tiers, favorites, conversations, messages,
--      notifications, company_verifications)
--   4. RLS politikalarının yeniden yazımı  (yetki yükseltme açıkları kapatıldı)
--   5. Indeksler
--   6. Storage bucket'ları
--   7. Kategori seed
-- ============================================================

create extension if not exists pg_trgm;

-- ============================================================
-- 1. YARDIMCI FONKSİYONLAR
-- ============================================================

-- RLS içinden profiles'a bakarken sonsuz döngüye girmemek için SECURITY DEFINER.
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p where p.id = uid and p.role = 'admin'
  );
$$;

revoke execute on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to anon, authenticated, service_role;

-- Servis anahtarı / doğrudan psql ile bağlanan bakım işleri koruma tetikleyicilerinden muaf.
create or replace function public.is_service_context()
returns boolean
language sql
stable
as $$
  select current_user in ('service_role', 'postgres', 'supabase_admin');
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Kayıt olan her kullanıcı için otomatik profil.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'phone', ''), new.phone),
    coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'buyer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. MEVCUT TABLOLARIN GENİŞLETİLMESİ
-- ============================================================

-- ---- profiles ----
alter table profiles
  add column if not exists avatar_url text,
  add column if not exists updated_at timestamptz not null default now();

-- role'ü sadece admin değiştirebilir. Aksi halde kullanıcı kendini admin yapabilirdi.
-- DİKKAT: koruma tetikleyicileri bilerek SECURITY DEFINER DEĞİLDİR. Definer
-- bağlamında current_user fonksiyon sahibine dönüşür ve is_service_context()
-- her çağıran için true olurdu; koruma tümüyle devre dışı kalırdı.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.role is distinct from old.role
     and not public.is_admin()
     and not public.is_service_context() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_columns on profiles;
create trigger profiles_protect_columns
  before update on profiles
  for each row execute function public.protect_profile_columns();

drop trigger if exists profiles_touch_updated_at on profiles;
create trigger profiles_touch_updated_at
  before update on profiles
  for each row execute function public.touch_updated_at();

-- ---- companies ----
alter table companies
  add column if not exists type text not null default 'supplier'
    check (type in ('supplier', 'buyer', 'both')),
  add column if not exists district text,
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists whatsapp text,
  add column if not exists website text,
  add column if not exists cover_url text,
  add column if not exists tax_number text,
  add column if not exists status text not null default 'active'
    check (status in ('active', 'passive')),
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references profiles(id),
  add column if not exists response_rate smallint
    check (response_rate between 0 and 100),
  add column if not exists avg_response_hours numeric(5,1),
  add column if not exists updated_at timestamptz not null default now();

-- verified / verified_at / verified_by yalnızca admin tarafından yazılabilir.
-- Aksi halde firma sahibi kendine saha doğrulama rozeti verebilirdi.
create or replace function public.protect_company_columns()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() and not public.is_service_context() then
    new.verified    := old.verified;
    new.verified_at := old.verified_at;
    new.verified_by := old.verified_by;
    new.owner_id    := old.owner_id;
  end if;
  return new;
end;
$$;

drop trigger if exists companies_protect_columns on companies;
create trigger companies_protect_columns
  before update on companies
  for each row execute function public.protect_company_columns();

drop trigger if exists companies_touch_updated_at on companies;
create trigger companies_touch_updated_at
  before update on companies
  for each row execute function public.touch_updated_at();

-- Yeni firma kaydı doğrulanmamış başlar; sahibi insert sırasında da rozet yazamaz.
create or replace function public.force_company_unverified()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() and not public.is_service_context() then
    new.verified    := false;
    new.verified_at := null;
    new.verified_by := null;
  end if;
  return new;
end;
$$;

drop trigger if exists companies_force_unverified on companies;
create trigger companies_force_unverified
  before insert on companies
  for each row execute function public.force_company_unverified();

-- ---- products ----
alter table products
  add column if not exists brand text,
  add column if not exists stock_quantity integer not null default 0
    check (stock_quantity >= 0),
  add column if not exists price_hidden boolean not null default false,
  add column if not exists attributes jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists products_touch_updated_at on products;
create trigger products_touch_updated_at
  before update on products
  for each row execute function public.touch_updated_at();

-- ---- rfqs ----
alter table rfqs
  add column if not exists city text,
  add column if not exists delivery_days integer,
  add column if not exists deadline date,
  add column if not exists attachments text[] not null default '{}',
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists rfqs_touch_updated_at on rfqs;
create trigger rfqs_touch_updated_at
  before update on rfqs
  for each row execute function public.touch_updated_at();

-- ---- quotes ----
alter table quotes
  add column if not exists currency text not null default 'TRY',
  add column if not exists moq integer,
  add column if not exists delivery_days integer,
  add column if not exists valid_until date,
  add column if not exists updated_at timestamptz not null default now();

-- Aynı firma bir RFQ'ya tek teklif verir.
create unique index if not exists quotes_rfq_company_uniq on quotes (rfq_id, company_id);

-- Alıcı yalnızca `status` alanını değiştirebilir; teklifin fiyatını/şartlarını
-- yalnızca teklifi veren firma değiştirebilir.
create or replace function public.protect_quote_columns()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  is_owner boolean;
begin
  if public.is_admin() or public.is_service_context() then
    return new;
  end if;

  select exists (
    select 1 from public.companies c
    where c.id = old.company_id and c.owner_id = auth.uid()
  ) into is_owner;

  if not is_owner then
    -- Teklifi veren firma değil (yani RFQ sahibi): sadece durumu değiştirebilir.
    new.price         := old.price;
    new.message       := old.message;
    new.moq           := old.moq;
    new.delivery_days := old.delivery_days;
    new.valid_until   := old.valid_until;
    new.currency      := old.currency;
  else
    -- Teklifi veren firma kendi teklifini kabul/ret edemez.
    new.status := old.status;
  end if;

  new.rfq_id     := old.rfq_id;
  new.company_id := old.company_id;
  return new;
end;
$$;

drop trigger if exists quotes_protect_columns on quotes;
create trigger quotes_protect_columns
  before update on quotes
  for each row execute function public.protect_quote_columns();

drop trigger if exists quotes_touch_updated_at on quotes;
create trigger quotes_touch_updated_at
  before update on quotes
  for each row execute function public.touch_updated_at();

-- ---- categories ----
alter table categories
  add column if not exists description text,
  add column if not exists sort_order integer not null default 0;

-- ============================================================
-- 3. YENİ TABLOLAR
-- ============================================================

-- Kademeli fiyatlandırma: adet arttıkça birim fiyat düşer.
create table if not exists price_tiers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  min_quantity integer not null check (min_quantity > 0),
  max_quantity integer check (max_quantity is null or max_quantity >= min_quantity),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  currency text not null default 'TRY',
  created_at timestamptz not null default now(),
  unique (product_id, min_quantity)
);

alter table price_tiers enable row level security;

create table if not exists company_verifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  note text,
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table company_verifications enable row level security;

create table if not exists favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  rfq_id uuid references rfqs(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- tam olarak bir hedef
  constraint favorites_single_target check (
    (product_id is not null)::int + (company_id is not null)::int + (rfq_id is not null)::int = 1
  )
);

create unique index if not exists favorites_user_product_uniq
  on favorites (user_id, product_id) where product_id is not null;
create unique index if not exists favorites_user_company_uniq
  on favorites (user_id, company_id) where company_id is not null;
create unique index if not exists favorites_user_rfq_uniq
  on favorites (user_id, rfq_id) where rfq_id is not null;

alter table favorites enable row level security;

-- Ürün veya RFQ bağlamlı birebir görüşme.
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references profiles(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  rfq_id uuid references rfqs(id) on delete set null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table conversations enable row level security;

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null check (length(btrim(body)) > 0),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table messages enable row level security;

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;

-- ============================================================
-- 4. RLS POLİTİKALARI (yeniden yazım)
--    auth.uid() çağrıları (select auth.uid()) olarak sarmalandı; böylece
--    Postgres değeri satır başına değil sorgu başına bir kez hesaplar.
-- ============================================================

-- ---- profiles ----
drop policy if exists "Herkes profilleri görebilir"          on profiles;
drop policy if exists "Kullanıcı kendi profilini günceller"  on profiles;
drop policy if exists "Kullanıcı kendi profilini oluşturur"  on profiles;

-- Telefon numarası herkese açık olmasın: profilleri yalnızca sahibi ve admin okur.
-- Firma bilgileri zaten `companies` üzerinden herkese açık.
create policy "profiles_select_own" on profiles
  for select using ((select auth.uid()) = id or public.is_admin());

create policy "profiles_insert_own" on profiles
  for insert with check ((select auth.uid()) = id);

create policy "profiles_update_own" on profiles
  for update using ((select auth.uid()) = id or public.is_admin())
  with check ((select auth.uid()) = id or public.is_admin());

-- ---- companies ----
drop policy if exists "Herkes firmaları görebilir"  on companies;
drop policy if exists "Sahibi firmasını yönetir"    on companies;
drop policy if exists "Sahibi firmasını günceller"  on companies;

create policy "companies_select_public" on companies
  for select using (status = 'active' or owner_id = (select auth.uid()) or public.is_admin());

create policy "companies_insert_own" on companies
  for insert with check (owner_id = (select auth.uid()));

create policy "companies_update_own" on companies
  for update using (owner_id = (select auth.uid()) or public.is_admin())
  with check (owner_id = (select auth.uid()) or public.is_admin());

create policy "companies_delete_admin" on companies
  for delete using (public.is_admin());

-- ---- categories ----
drop policy if exists "Herkes kategorileri görebilir" on categories;

create policy "categories_select_all" on categories
  for select using (true);

create policy "categories_write_admin" on categories
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- products ----
drop policy if exists "Herkes aktif ürünleri görebilir"       on products;
drop policy if exists "Firma sahibi kendi ürününü görebilir"  on products;
drop policy if exists "Firma sahibi ürün ekler"               on products;
drop policy if exists "Firma sahibi ürününü günceller"        on products;
drop policy if exists "Firma sahibi ürününü siler"            on products;

create policy "products_select_active" on products
  for select using (status = 'active');

create policy "products_select_own" on products
  for select using (
    public.is_admin()
    or exists (
      select 1 from companies c
      where c.id = company_id and c.owner_id = (select auth.uid())
    )
  );

create policy "products_insert_own" on products
  for insert with check (
    exists (
      select 1 from companies c
      where c.id = company_id and c.owner_id = (select auth.uid())
    )
  );

create policy "products_update_own" on products
  for update using (
    public.is_admin()
    or exists (
      select 1 from companies c
      where c.id = company_id and c.owner_id = (select auth.uid())
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from companies c
      where c.id = company_id and c.owner_id = (select auth.uid())
    )
  );

create policy "products_delete_own" on products
  for delete using (
    public.is_admin()
    or exists (
      select 1 from companies c
      where c.id = company_id and c.owner_id = (select auth.uid())
    )
  );

-- ---- price_tiers ----
create policy "price_tiers_select_public" on price_tiers
  for select using (
    exists (
      select 1 from products p
      where p.id = product_id
        and (p.status = 'active' or p.company_id in (
          select c.id from companies c where c.owner_id = (select auth.uid())
        ))
    )
  );

create policy "price_tiers_write_own" on price_tiers
  for all using (
    public.is_admin()
    or exists (
      select 1 from products p
      join companies c on c.id = p.company_id
      where p.id = product_id and c.owner_id = (select auth.uid())
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from products p
      join companies c on c.id = p.company_id
      where p.id = product_id and c.owner_id = (select auth.uid())
    )
  );

-- ---- rfqs ----
drop policy if exists "Herkes açık RFQ'ları görebilir"    on rfqs;
drop policy if exists "Alıcı kendi RFQ'sunu görebilir"    on rfqs;
drop policy if exists "Alıcı RFQ oluşturur"               on rfqs;
drop policy if exists "Alıcı kendi RFQ'sunu günceller"    on rfqs;

create policy "rfqs_select_open" on rfqs
  for select using (status = 'open');

create policy "rfqs_select_own" on rfqs
  for select using (buyer_id = (select auth.uid()) or public.is_admin());

create policy "rfqs_insert_own" on rfqs
  for insert with check (buyer_id = (select auth.uid()));

create policy "rfqs_update_own" on rfqs
  for update using (buyer_id = (select auth.uid()) or public.is_admin())
  with check (buyer_id = (select auth.uid()) or public.is_admin());

create policy "rfqs_delete_own" on rfqs
  for delete using (buyer_id = (select auth.uid()) or public.is_admin());

-- ---- quotes ----
drop policy if exists "RFQ sahibi ve teklif veren firma teklifi görebilir" on quotes;
drop policy if exists "Firma sahibi teklif verir"                          on quotes;
drop policy if exists "RFQ sahibi teklif durumunu günceller"               on quotes;

create policy "quotes_select_parties" on quotes
  for select using (
    public.is_admin()
    or exists (select 1 from rfqs r where r.id = rfq_id and r.buyer_id = (select auth.uid()))
    or exists (select 1 from companies c where c.id = company_id and c.owner_id = (select auth.uid()))
  );

create policy "quotes_insert_supplier" on quotes
  for insert with check (
    exists (select 1 from companies c where c.id = company_id and c.owner_id = (select auth.uid()))
    and exists (select 1 from rfqs r where r.id = rfq_id and r.status = 'open')
  );

-- Hangi kolonun kime açık olduğu protect_quote_columns tetikleyicisinde zorlanır.
create policy "quotes_update_parties" on quotes
  for update using (
    public.is_admin()
    or exists (select 1 from rfqs r where r.id = rfq_id and r.buyer_id = (select auth.uid()))
    or exists (select 1 from companies c where c.id = company_id and c.owner_id = (select auth.uid()))
  )
  with check (
    public.is_admin()
    or exists (select 1 from rfqs r where r.id = rfq_id and r.buyer_id = (select auth.uid()))
    or exists (select 1 from companies c where c.id = company_id and c.owner_id = (select auth.uid()))
  );

create policy "quotes_delete_supplier" on quotes
  for delete using (
    public.is_admin()
    or exists (select 1 from companies c where c.id = company_id and c.owner_id = (select auth.uid()))
  );

-- ---- company_verifications ----
create policy "verifications_select_parties" on company_verifications
  for select using (
    public.is_admin()
    or exists (select 1 from companies c where c.id = company_id and c.owner_id = (select auth.uid()))
  );

create policy "verifications_insert_owner" on company_verifications
  for insert with check (
    exists (select 1 from companies c where c.id = company_id and c.owner_id = (select auth.uid()))
  );

create policy "verifications_update_admin" on company_verifications
  for update using (public.is_admin()) with check (public.is_admin());

-- ---- favorites ----
create policy "favorites_own" on favorites
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---- conversations ----
create policy "conversations_select_parties" on conversations
  for select using (
    buyer_id = (select auth.uid())
    or exists (select 1 from companies c where c.id = company_id and c.owner_id = (select auth.uid()))
  );

create policy "conversations_insert_buyer" on conversations
  for insert with check (buyer_id = (select auth.uid()));

create policy "conversations_update_parties" on conversations
  for update using (
    buyer_id = (select auth.uid())
    or exists (select 1 from companies c where c.id = company_id and c.owner_id = (select auth.uid()))
  )
  with check (
    buyer_id = (select auth.uid())
    or exists (select 1 from companies c where c.id = company_id and c.owner_id = (select auth.uid()))
  );

-- ---- messages ----
create policy "messages_select_parties" on messages
  for select using (
    exists (
      select 1 from conversations cv
      where cv.id = conversation_id
        and (
          cv.buyer_id = (select auth.uid())
          or exists (select 1 from companies c where c.id = cv.company_id and c.owner_id = (select auth.uid()))
        )
    )
  );

create policy "messages_insert_parties" on messages
  for insert with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from conversations cv
      where cv.id = conversation_id
        and (
          cv.buyer_id = (select auth.uid())
          or exists (select 1 from companies c where c.id = cv.company_id and c.owner_id = (select auth.uid()))
        )
    )
  );

-- Okundu bilgisini alıcı taraf işaretler.
create policy "messages_update_recipient" on messages
  for update using (
    sender_id <> (select auth.uid())
    and exists (
      select 1 from conversations cv
      where cv.id = conversation_id
        and (
          cv.buyer_id = (select auth.uid())
          or exists (select 1 from companies c where c.id = cv.company_id and c.owner_id = (select auth.uid()))
        )
    )
  )
  with check (true);

-- ---- notifications ----
create policy "notifications_select_own" on notifications
  for select using (user_id = (select auth.uid()));

create policy "notifications_update_own" on notifications
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- notifications tablosunda INSERT politikası yoktur: bildirimleri yalnızca
-- sunucu tarafı (service_role) veya tetikleyiciler üretir.

-- Yeni mesaj geldiğinde konuşmayı listenin başına taşı.
create or replace function public.bump_conversation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.conversations
     set last_message_at = new.created_at
   where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_bump_conversation on messages;
create trigger messages_bump_conversation
  after insert on messages
  for each row execute function public.bump_conversation();

-- ============================================================
-- 5. INDEKSLER
--    Yabancı anahtarların hiçbirinde indeks yoktu; RLS politikaları bu
--    kolonlar üzerinden EXISTS alt sorgusu çalıştırdığı için her okuma
--    seq scan'e düşüyordu.
-- ============================================================

create index if not exists companies_owner_id_idx      on companies (owner_id);
create index if not exists companies_city_idx          on companies (city);
create index if not exists companies_verified_idx      on companies (verified) where verified;
create index if not exists companies_name_trgm_idx     on companies using gin (name gin_trgm_ops);

create index if not exists categories_parent_id_idx    on categories (parent_id);

create index if not exists products_company_id_idx     on products (company_id);
create index if not exists products_category_id_idx    on products (category_id);
create index if not exists products_status_idx         on products (status) where status = 'active';
create index if not exists products_created_at_idx     on products (created_at desc);
create index if not exists products_title_trgm_idx     on products using gin (title gin_trgm_ops);

create index if not exists price_tiers_product_id_idx  on price_tiers (product_id, min_quantity);

create index if not exists rfqs_buyer_id_idx           on rfqs (buyer_id);
create index if not exists rfqs_category_id_idx        on rfqs (category_id);
create index if not exists rfqs_status_created_idx     on rfqs (status, created_at desc);
create index if not exists rfqs_title_trgm_idx         on rfqs using gin (title gin_trgm_ops);

create index if not exists quotes_rfq_id_idx           on quotes (rfq_id);
create index if not exists quotes_company_id_idx       on quotes (company_id);

create index if not exists favorites_user_id_idx       on favorites (user_id);

create index if not exists conversations_buyer_idx     on conversations (buyer_id, last_message_at desc);
create index if not exists conversations_company_idx   on conversations (company_id, last_message_at desc);

create index if not exists messages_conversation_idx   on messages (conversation_id, created_at);

create index if not exists notifications_user_idx      on notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx    on notifications (user_id) where read_at is null;

create index if not exists verifications_company_idx   on company_verifications (company_id);
create index if not exists verifications_pending_idx   on company_verifications (status) where status = 'pending';

-- ============================================================
-- 6. STORAGE
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('company-logos',   'company-logos',   true,  2  * 1024 * 1024,
     array['image/png','image/jpeg','image/webp','image/svg+xml']),
  ('product-images',  'product-images',  true,  5  * 1024 * 1024,
     array['image/png','image/jpeg','image/webp']),
  ('rfq-attachments', 'rfq-attachments', false, 10 * 1024 * 1024,
     array['application/pdf','image/png','image/jpeg','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/csv'])
on conflict (id) do nothing;

-- Yol düzeni: <bucket>/<company_id>/... ve rfq-attachments/<rfq_id>/...
drop policy if exists "company_logos_public_read"  on storage.objects;
create policy "company_logos_public_read" on storage.objects
  for select using (bucket_id = 'company-logos');

drop policy if exists "company_logos_owner_write" on storage.objects;
create policy "company_logos_owner_write" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'company-logos'
    and exists (
      select 1 from public.companies c
      where c.id::text = (storage.foldername(name))[1]
        and c.owner_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'company-logos'
    and exists (
      select 1 from public.companies c
      where c.id::text = (storage.foldername(name))[1]
        and c.owner_id = (select auth.uid())
    )
  );

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "product_images_owner_write" on storage.objects;
create policy "product_images_owner_write" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.companies c
      where c.id::text = (storage.foldername(name))[1]
        and c.owner_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.companies c
      where c.id::text = (storage.foldername(name))[1]
        and c.owner_id = (select auth.uid())
    )
  );

drop policy if exists "rfq_attachments_parties" on storage.objects;
create policy "rfq_attachments_parties" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'rfq-attachments'
    and exists (
      select 1 from public.rfqs r
      where r.id::text = (storage.foldername(name))[1]
        and (r.status = 'open' or r.buyer_id = (select auth.uid()))
    )
  );

drop policy if exists "rfq_attachments_owner_write" on storage.objects;
create policy "rfq_attachments_owner_write" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'rfq-attachments'
    and exists (
      select 1 from public.rfqs r
      where r.id::text = (storage.foldername(name))[1]
        and r.buyer_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'rfq-attachments'
    and exists (
      select 1 from public.rfqs r
      where r.id::text = (storage.foldername(name))[1]
        and r.buyer_id = (select auth.uid())
    )
  );

-- ============================================================
-- 7. KATEGORİ SEED
-- ============================================================

insert into categories (name, slug, sort_order) values
  ('Ambalaj',    'ambalaj',    10),
  ('Elektronik', 'elektronik', 20),
  ('Tekstil',    'tekstil',    30),
  ('Otomotiv',   'otomotiv',   40),
  ('Makine',     'makine',     50),
  ('Gıda',       'gida',       60),
  ('Kozmetik',   'kozmetik',   70),
  ('Hırdavat',   'hirdavat',   80),
  ('Plastik',    'plastik',    90),
  ('Kırtasiye',  'kirtasiye', 100),
  ('Kimya',      'kimya',     110),
  ('Yapı',       'yapi',      120)
on conflict (slug) do nothing;

insert into categories (name, slug, parent_id, sort_order)
select v.name, v.slug, p.id, v.sort_order
from (values
  ('Karton Kutu',        'karton-kutu',        'ambalaj',    10),
  ('Plastik Kasa',       'plastik-kasa',       'ambalaj',    20),
  ('Streç Film',         'strec-film',         'ambalaj',    30),
  ('Balonlu Naylon',     'balonlu-naylon',     'ambalaj',    40),
  ('Koli Bandı',         'koli-bandi',         'ambalaj',    50),
  ('Kablo & Konnektör',  'kablo-konnektor',    'elektronik', 10),
  ('Elektronik Modül',   'elektronik-modul',   'elektronik', 20),
  ('Aydınlatma',         'aydinlatma',         'elektronik', 30),
  ('Kumaş',              'kumas',              'tekstil',    10),
  ('İplik',              'iplik',              'tekstil',    20),
  ('Hazır Giyim',        'hazir-giyim',        'tekstil',    30),
  ('Yedek Parça',        'yedek-parca',        'otomotiv',   10),
  ('Lastik',             'lastik',             'otomotiv',   20),
  ('CNC Tezgah',         'cnc-tezgah',         'makine',     10),
  ('Konveyör',           'konveyor',           'makine',     20),
  ('Kuru Gıda',          'kuru-gida',          'gida',       10),
  ('İçecek',             'icecek',             'gida',       20)
) as v(name, slug, parent_slug, sort_order)
join categories p on p.slug = v.parent_slug
on conflict (slug) do nothing;


-- ============ 20260901100000_rfq_quote_count.sql ============
-- ============================================================
-- RFQ teklif sayacı
--
-- Sorun: liste sayfaları teklif sayısını `quotes(count)` ile okuyordu.
-- RLS teklif satırlarını yalnızca taraflara gösterdiği için anonim
-- ziyaretçiye her RFQ "0 teklif" görünüyordu — yanlış bilgi.
--
-- Çözüm: teklif SAYISI herkese açık bir pazar sinyalidir, teklif İÇERİĞİ
-- gizli kalır. Sayıyı rfqs üzerinde denormalize edip tetikleyiciyle
-- güncel tutuyoruz. Liste sorguları da böylece tek tabloya iniyor.
-- ============================================================

alter table rfqs
  add column if not exists quote_count integer not null default 0
    check (quote_count >= 0);

create or replace function public.sync_rfq_quote_count()
returns trigger
language plpgsql
-- Tedarikçi teklif eklerken rfqs satırını güncelleme yetkisi yoktur;
-- sayaç için yükseltilmiş yetki gerekir. Burada yetki KARARI verilmediği,
-- yalnızca sayaç güncellendiği için definer bağlamı güvenli.
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    update public.rfqs set quote_count = quote_count + 1 where id = new.rfq_id;
  elsif tg_op = 'DELETE' then
    update public.rfqs set quote_count = greatest(quote_count - 1, 0) where id = old.rfq_id;
  end if;
  return null;
end;
$$;

drop trigger if exists quotes_sync_count on quotes;
create trigger quotes_sync_count
  after insert or delete on quotes
  for each row execute function public.sync_rfq_quote_count();

-- Mevcut satırları doldur.
update rfqs r
   set quote_count = coalesce(c.n, 0)
  from (select rfq_id, count(*) as n from quotes group by rfq_id) c
 where c.rfq_id = r.id;

update rfqs set quote_count = 0
 where id not in (select distinct rfq_id from quotes);


-- ============ 20260901110000_category_translations.sql ============
-- ============================================================
-- Kategori çevirileri
--
-- Kategoriler kontrollü ve küçük bir söz varlığıdır (29 satır), bu yüzden
-- gerçekten çevrilebilirler. Asıl SEO kazancı DİLE ÖZEL SLUG'tır:
-- /en/category/packaging İngilizce aramada sıralanır, /en/category/ambalaj
-- sıralanmaz.
--
-- Ürün ve firma içeriği kaynak dilinde kalır (bkz. content_language).
-- ============================================================

create table if not exists category_translations (
  category_id uuid not null references categories(id) on delete cascade,
  locale text not null check (locale in ('tr', 'en', 'ru')),
  name text not null,
  slug text not null,
  description text,
  created_at timestamptz not null default now(),
  primary key (category_id, locale),
  -- Aynı dilde iki kategori aynı slug'ı alamaz; URL çakışması olmaz.
  unique (locale, slug)
);

alter table category_translations enable row level security;

create policy "category_translations_select_all" on category_translations
  for select using (true);

create policy "category_translations_write_admin" on category_translations
  for all using (public.is_admin()) with check (public.is_admin());

create index if not exists category_translations_lookup_idx
  on category_translations (locale, slug);

-- ---- Türkçe: mevcut kategorilerden türet (kaynak dil) ----
insert into category_translations (category_id, locale, name, slug)
select id, 'tr', name, slug from categories
on conflict (category_id, locale) do nothing;

-- ---- İngilizce ve Rusça ----
insert into category_translations (category_id, locale, name, slug)
select c.id, v.locale, v.name, v.slug
from (values
  -- kök kategoriler
  ('ambalaj',          'en', 'Packaging',            'packaging'),
  ('ambalaj',          'ru', 'Упаковка',             'upakovka'),
  ('elektronik',       'en', 'Electronics',          'electronics'),
  ('elektronik',       'ru', 'Электроника',          'elektronika'),
  ('tekstil',          'en', 'Textiles',             'textiles'),
  ('tekstil',          'ru', 'Текстиль',             'tekstil'),
  ('otomotiv',         'en', 'Automotive',           'automotive'),
  ('otomotiv',         'ru', 'Автотовары',           'avtotovary'),
  ('makine',           'en', 'Machinery',            'machinery'),
  ('makine',           'ru', 'Оборудование',         'oborudovanie'),
  ('gida',             'en', 'Food',                 'food'),
  ('gida',             'ru', 'Продукты питания',     'produkty-pitaniya'),
  ('kozmetik',         'en', 'Cosmetics',            'cosmetics'),
  ('kozmetik',         'ru', 'Косметика',            'kosmetika'),
  ('hirdavat',         'en', 'Hardware',             'hardware'),
  ('hirdavat',         'ru', 'Скобяные изделия',     'skobyanye-izdeliya'),
  ('plastik',          'en', 'Plastics',             'plastics'),
  ('plastik',          'ru', 'Пластик',              'plastik'),
  ('kirtasiye',        'en', 'Stationery',           'stationery'),
  ('kirtasiye',        'ru', 'Канцтовары',           'kanctovary'),
  ('kimya',            'en', 'Chemicals',            'chemicals'),
  ('kimya',            'ru', 'Химия',                'himiya'),
  ('yapi',             'en', 'Construction',         'construction'),
  ('yapi',             'ru', 'Стройматериалы',       'stroymaterialy'),
  -- alt kategoriler
  ('karton-kutu',      'en', 'Cardboard Boxes',      'cardboard-boxes'),
  ('karton-kutu',      'ru', 'Картонные коробки',    'kartonnye-korobki'),
  ('plastik-kasa',     'en', 'Plastic Crates',       'plastic-crates'),
  ('plastik-kasa',     'ru', 'Пластиковые ящики',    'plastikovye-yashchiki'),
  ('strec-film',       'en', 'Stretch Film',         'stretch-film'),
  ('strec-film',       'ru', 'Стретч-плёнка',        'stretch-plenka'),
  ('balonlu-naylon',   'en', 'Bubble Wrap',          'bubble-wrap'),
  ('balonlu-naylon',   'ru', 'Воздушно-пузырьковая плёнка', 'puzyrchataya-plenka'),
  ('koli-bandi',       'en', 'Packing Tape',         'packing-tape'),
  ('koli-bandi',       'ru', 'Упаковочная лента',    'upakovochnaya-lenta'),
  ('kablo-konnektor',  'en', 'Cables & Connectors',  'cables-connectors'),
  ('kablo-konnektor',  'ru', 'Кабели и разъёмы',     'kabeli-razemy'),
  ('elektronik-modul', 'en', 'Electronic Modules',   'electronic-modules'),
  ('elektronik-modul', 'ru', 'Электронные модули',   'elektronnye-moduli'),
  ('aydinlatma',       'en', 'Lighting',             'lighting'),
  ('aydinlatma',       'ru', 'Освещение',            'osveshchenie'),
  ('kumas',            'en', 'Fabric',               'fabric'),
  ('kumas',            'ru', 'Ткани',                'tkani'),
  ('iplik',            'en', 'Yarn',                 'yarn'),
  ('iplik',            'ru', 'Пряжа',                'pryazha'),
  ('hazir-giyim',      'en', 'Apparel',              'apparel'),
  ('hazir-giyim',      'ru', 'Готовая одежда',       'gotovaya-odezhda'),
  ('yedek-parca',      'en', 'Spare Parts',          'spare-parts'),
  ('yedek-parca',      'ru', 'Запчасти',             'zapchasti'),
  ('lastik',           'en', 'Tyres',                'tyres'),
  ('lastik',           'ru', 'Шины',                 'shiny'),
  ('cnc-tezgah',       'en', 'CNC Machines',         'cnc-machines'),
  ('cnc-tezgah',       'ru', 'Станки с ЧПУ',         'stanki-chpu'),
  ('konveyor',         'en', 'Conveyors',            'conveyors'),
  ('konveyor',         'ru', 'Конвейеры',            'konveyery'),
  ('kuru-gida',        'en', 'Dry Food',             'dry-food'),
  ('kuru-gida',        'ru', 'Бакалея',              'bakaleya'),
  ('icecek',           'en', 'Beverages',            'beverages'),
  ('icecek',           'ru', 'Напитки',              'napitki')
) as v(tr_slug, locale, name, slug)
join categories c on c.slug = v.tr_slug
on conflict (category_id, locale) do nothing;

-- ============================================================
-- İçerik dili
--
-- Ürün ve firma metinlerini tedarikçi kendi dilinde yazar. Hangi dilde
-- yazıldığını saklamak, arayüzde "bu ilan Türkçe yayınlandı" uyarısı
-- göstermeyi ve ileride makine çevirisi eklemeyi mümkün kılar.
-- ============================================================

alter table products
  add column if not exists content_language text not null default 'tr'
    check (content_language in ('tr', 'en', 'ru'));

alter table companies
  add column if not exists content_language text not null default 'tr'
    check (content_language in ('tr', 'en', 'ru'));

alter table rfqs
  add column if not exists content_language text not null default 'tr'
    check (content_language in ('tr', 'en', 'ru'));


-- ============ 20260901120000_commerce_core.sql ============
-- ============================================================
-- Ticaret çekirdeği
--   1. Ürünlerde ticari şartlar (Incoterm, ambalaj, üretim süresi)
--   2. Çoklu para birimi + yaklaşık kur çevrimi
--   3. Siparişler (anlaşma takibi) + durum geçmişi
--   4. Numune talepleri
--   5. Firma sertifikaları
--   6. Teklif revizyonları (karşı teklif turları)
-- ============================================================

-- ============================================================
-- 1. ÜRÜN TİCARİ ŞARTLARI
-- ============================================================

alter table products
  add column if not exists incoterm text
    check (incoterm is null or incoterm in
      ('EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP')),
  add column if not exists payment_terms text,
  add column if not exists lead_time_days integer check (lead_time_days is null or lead_time_days > 0),
  -- Koli/palet: "10 koli mi 240 adet mi" karışıklığını bitirir.
  add column if not exists units_per_case integer check (units_per_case is null or units_per_case > 0),
  add column if not exists cases_per_pallet integer check (cases_per_pallet is null or cases_per_pallet > 0),
  add column if not exists hs_code text,
  add column if not exists min_order_value numeric(12,2) check (min_order_value is null or min_order_value >= 0),
  add column if not exists sample_available boolean not null default false,
  add column if not exists sample_price numeric(12,2) check (sample_price is null or sample_price >= 0);

-- ============================================================
-- 2. ÇOKLU PARA BİRİMİ
-- ============================================================

create table if not exists currencies (
  code text primary key,
  symbol text not null,
  name_tr text not null,
  sort_order integer not null default 0
);

insert into currencies (code, symbol, name_tr, sort_order) values
  ('TRY', '₺', 'Türk Lirası',   10),
  ('USD', '$', 'Amerikan Doları', 20),
  ('EUR', '€', 'Euro',          30),
  ('RUB', '₽', 'Rus Rublesi',   40)
on conflict (code) do nothing;

alter table currencies enable row level security;
create policy "currencies_select_all" on currencies for select using (true);

/*
  Yaklaşık kur. Alıcıya "≈" ile gösterilir; sözleşme değeri DAİMA
  ürünün kendi para birimidir. Güncelleme bir cron/Edge Function işidir;
  buradaki değerler yalnızca başlangıç.
*/
create table if not exists exchange_rates (
  base text not null references currencies(code),
  quote text not null references currencies(code),
  rate numeric(18,8) not null check (rate > 0),
  fetched_at timestamptz not null default now(),
  primary key (base, quote)
);

alter table exchange_rates enable row level security;
create policy "exchange_rates_select_all" on exchange_rates for select using (true);
create policy "exchange_rates_write_admin" on exchange_rates
  for all using (public.is_admin()) with check (public.is_admin());

insert into exchange_rates (base, quote, rate) values
  ('TRY','USD',0.029), ('TRY','EUR',0.027), ('TRY','RUB',2.75), ('TRY','TRY',1),
  ('USD','TRY',34.50),  ('USD','EUR',0.92),  ('USD','RUB',95.0), ('USD','USD',1),
  ('EUR','TRY',37.50),  ('EUR','USD',1.09),  ('EUR','RUB',103.0),('EUR','EUR',1),
  ('RUB','TRY',0.363),  ('RUB','USD',0.0105),('RUB','EUR',0.0097),('RUB','RUB',1)
on conflict (base, quote) do nothing;

-- Ürün ve teklif para birimleri artık tanımlı listeye bağlı.
alter table products
  drop constraint if exists products_currency_fkey,
  add constraint products_currency_fkey foreign key (currency) references currencies(code);
alter table price_tiers
  drop constraint if exists price_tiers_currency_fkey,
  add constraint price_tiers_currency_fkey foreign key (currency) references currencies(code);
alter table quotes
  drop constraint if exists quotes_currency_fkey,
  add constraint quotes_currency_fkey foreign key (currency) references currencies(code);

-- ============================================================
-- 3. SİPARİŞLER (anlaşma takibi)
-- ============================================================

create sequence if not exists order_code_seq;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  -- İnsan okunur referans: taraflar telefonda bunu söyler.
  code text not null unique
    default 'SUP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('order_code_seq')::text, 5, '0'),
  buyer_id uuid not null references profiles(id) on delete restrict,
  company_id uuid not null references companies(id) on delete restrict,
  quote_id uuid unique references quotes(id) on delete set null,
  rfq_id uuid references rfqs(id) on delete set null,
  product_id uuid references products(id) on delete set null,

  title text not null,
  quantity integer not null check (quantity > 0),
  unit text,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  currency text not null default 'TRY' references currencies(code),
  -- Toplam her zaman türetilir; elle girilip tutarsız kalamaz.
  total_amount numeric(16,2) generated always as (quantity * unit_price) stored,

  incoterm text,
  payment_terms text,
  delivery_address text,
  expected_delivery date,

  status text not null default 'pending' check (status in
    ('pending', 'confirmed', 'in_production', 'shipped', 'delivered', 'completed', 'cancelled')),
  cancel_reason text,
  buyer_note text,
  supplier_note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table orders enable row level security;

drop trigger if exists orders_touch_updated_at on orders;
create trigger orders_touch_updated_at
  before update on orders
  for each row execute function public.touch_updated_at();

-- Durum geçmişi: kim ne zaman hangi duruma aldı.
create table if not exists order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  from_status text,
  to_status text not null,
  note text,
  created_at timestamptz not null default now()
);

alter table order_events enable row level security;

/*
  Durum makinesi. Serbest geçişe izin verilseydi taraflar siparişi
  "tamamlandı"ya atlatıp geçmişi bozabilirdi.

    pending       → confirmed | cancelled          (tedarikçi onaylar)
    confirmed     → in_production | cancelled      (tedarikçi)
    in_production → shipped | cancelled            (tedarikçi)
    shipped       → delivered                      (alıcı teslim aldı)
    delivered     → completed                      (alıcı kapatır)
*/
create or replace function public.enforce_order_transition()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  is_supplier boolean;
  is_buyer boolean;
  allowed text[];
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if public.is_admin() or public.is_service_context() then
    return new;
  end if;

  select exists (
    select 1 from public.companies c
    where c.id = old.company_id and c.owner_id = auth.uid()
  ) into is_supplier;
  is_buyer := old.buyer_id = auth.uid();

  allowed := case old.status
    when 'pending'       then array['confirmed', 'cancelled']
    when 'confirmed'     then array['in_production', 'cancelled']
    when 'in_production' then array['shipped', 'cancelled']
    when 'shipped'       then array['delivered']
    when 'delivered'     then array['completed']
    else array[]::text[]
  end;

  if not (new.status = any(allowed)) then
    raise exception 'Geçersiz sipariş durumu geçişi: % -> %', old.status, new.status
      using errcode = 'check_violation';
  end if;

  -- Kimin hangi geçişi yapabileceği
  if new.status in ('confirmed', 'in_production', 'shipped') and not is_supplier then
    raise exception 'Bu durumu yalnızca tedarikçi değiştirebilir'
      using errcode = 'insufficient_privilege';
  end if;
  if new.status in ('delivered', 'completed') and not is_buyer then
    raise exception 'Bu durumu yalnızca alıcı değiştirebilir'
      using errcode = 'insufficient_privilege';
  end if;
  if new.status = 'cancelled' and not (is_buyer or is_supplier) then
    raise exception 'Yetkisiz iptal' using errcode = 'insufficient_privilege';
  end if;

  -- Ticari şartlar sipariş açıldıktan sonra tek taraflı değiştirilemez.
  new.unit_price := old.unit_price;
  new.quantity   := old.quantity;
  new.currency   := old.currency;
  new.buyer_id   := old.buyer_id;
  new.company_id := old.company_id;

  return new;
end;
$$;

drop trigger if exists orders_enforce_transition on orders;
create trigger orders_enforce_transition
  before update on orders
  for each row execute function public.enforce_order_transition();

-- Her durum değişimi geçmişe yazılır.
create or replace function public.log_order_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_events (order_id, actor_id, to_status, note)
    values (new.id, auth.uid(), new.status, 'Sipariş oluşturuldu');
  elsif new.status is distinct from old.status then
    insert into public.order_events (order_id, actor_id, from_status, to_status)
    values (new.id, auth.uid(), old.status, new.status);
  end if;
  return null;
end;
$$;

drop trigger if exists orders_log_event on orders;
create trigger orders_log_event
  after insert or update on orders
  for each row execute function public.log_order_event();

-- ============================================================
-- 4. NUMUNE TALEPLERİ
-- ============================================================

create table if not exists sample_requests (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references profiles(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  quantity integer not null default 1 check (quantity > 0),
  message text,
  shipping_address text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'sent', 'rejected')),
  tracking_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table sample_requests enable row level security;

drop trigger if exists sample_requests_touch on sample_requests;
create trigger sample_requests_touch before update on sample_requests
  for each row execute function public.touch_updated_at();

-- ============================================================
-- 5. FİRMA SERTİFİKALARI
-- ============================================================

create table if not exists company_certificates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  kind text not null default 'other'
    check (kind in ('iso', 'ce', 'tse', 'halal', 'organic', 'gmp', 'fsc', 'reach', 'other')),
  name text not null,
  issuer text,
  number text,
  issued_at date,
  expires_at date,
  document_url text,
  -- Rozet gibi: doğrulamayı yalnızca admin verir.
  verified boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

alter table company_certificates enable row level security;

create or replace function public.protect_certificate_verification()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() and not public.is_service_context() then
    new.verified := coalesce(
      case when tg_op = 'UPDATE' then old.verified else false end, false);
    new.verified_at := case when tg_op = 'UPDATE' then old.verified_at else null end;
  end if;
  return new;
end;
$$;

drop trigger if exists certificates_protect on company_certificates;
create trigger certificates_protect
  before insert or update on company_certificates
  for each row execute function public.protect_certificate_verification();

-- ============================================================
-- 6. TEKLİF REVİZYONLARI (karşı teklif turları)
--
-- B2B pazarlık tek atışlık değildir. Her tur burada saklanır; quotes
-- tablosu daima YÜRÜRLÜKTEKİ teklifi tutar.
-- ============================================================

create table if not exists quote_revisions (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  actor_id uuid not null references profiles(id) on delete cascade,
  -- 'supplier' teklif verir/günceller, 'buyer' karşı teklif yapar.
  side text not null check (side in ('supplier', 'buyer')),
  price numeric(12,2) not null check (price >= 0),
  currency text not null default 'TRY' references currencies(code),
  moq integer,
  delivery_days integer,
  message text,
  created_at timestamptz not null default now()
);

alter table quote_revisions enable row level security;

create index if not exists quote_revisions_quote_idx
  on quote_revisions (quote_id, created_at);

alter table quotes
  add column if not exists revision_count integer not null default 1;

-- ============================================================
-- 7. RLS POLİTİKALARI
-- ============================================================

-- ---- orders ----
create policy "orders_select_parties" on orders
  for select using (
    public.is_admin()
    or buyer_id = (select auth.uid())
    or exists (select 1 from companies c where c.id = company_id and c.owner_id = (select auth.uid()))
  );

-- Sipariş yalnızca KABUL EDİLMİŞ bir teklifden doğar; tek taraflı
-- uydurulamaz.
create policy "orders_insert_buyer" on orders
  for insert with check (
    buyer_id = (select auth.uid())
    and (
      quote_id is null
      or exists (
        select 1 from quotes q join rfqs r on r.id = q.rfq_id
        where q.id = quote_id
          and q.status = 'accepted'
          and r.buyer_id = (select auth.uid())
          and q.company_id = orders.company_id
      )
    )
  );

create policy "orders_update_parties" on orders
  for update using (
    public.is_admin()
    or buyer_id = (select auth.uid())
    or exists (select 1 from companies c where c.id = company_id and c.owner_id = (select auth.uid()))
  )
  with check (
    public.is_admin()
    or buyer_id = (select auth.uid())
    or exists (select 1 from companies c where c.id = company_id and c.owner_id = (select auth.uid()))
  );

-- ---- order_events ----
create policy "order_events_select_parties" on order_events
  for select using (
    exists (
      select 1 from orders o
      where o.id = order_id
        and (
          public.is_admin()
          or o.buyer_id = (select auth.uid())
          or exists (select 1 from companies c where c.id = o.company_id and c.owner_id = (select auth.uid()))
        )
    )
  );

-- ---- sample_requests ----
create policy "sample_requests_select_parties" on sample_requests
  for select using (
    public.is_admin()
    or buyer_id = (select auth.uid())
    or exists (select 1 from companies c where c.id = company_id and c.owner_id = (select auth.uid()))
  );

create policy "sample_requests_insert_buyer" on sample_requests
  for insert with check (buyer_id = (select auth.uid()));

create policy "sample_requests_update_parties" on sample_requests
  for update using (
    buyer_id = (select auth.uid())
    or exists (select 1 from companies c where c.id = company_id and c.owner_id = (select auth.uid()))
  )
  with check (
    buyer_id = (select auth.uid())
    or exists (select 1 from companies c where c.id = company_id and c.owner_id = (select auth.uid()))
  );

-- ---- company_certificates ----
create policy "certificates_select_public" on company_certificates
  for select using (true);

create policy "certificates_write_owner" on company_certificates
  for all using (
    public.is_admin()
    or exists (select 1 from companies c where c.id = company_id and c.owner_id = (select auth.uid()))
  )
  with check (
    public.is_admin()
    or exists (select 1 from companies c where c.id = company_id and c.owner_id = (select auth.uid()))
  );

-- ---- quote_revisions ----
create policy "quote_revisions_select_parties" on quote_revisions
  for select using (
    exists (
      select 1 from quotes q
      where q.id = quote_id
        and (
          public.is_admin()
          or exists (select 1 from rfqs r where r.id = q.rfq_id and r.buyer_id = (select auth.uid()))
          or exists (select 1 from companies c where c.id = q.company_id and c.owner_id = (select auth.uid()))
        )
    )
  );

create policy "quote_revisions_insert_parties" on quote_revisions
  for insert with check (
    actor_id = (select auth.uid())
    and exists (
      select 1 from quotes q
      where q.id = quote_id
        and (
          (side = 'buyer'
            and exists (select 1 from rfqs r where r.id = q.rfq_id and r.buyer_id = (select auth.uid())))
          or (side = 'supplier'
            and exists (select 1 from companies c where c.id = q.company_id and c.owner_id = (select auth.uid())))
        )
    )
  );

-- ============================================================
-- 8. INDEKSLER
-- ============================================================

create index if not exists orders_buyer_idx      on orders (buyer_id, created_at desc);
create index if not exists orders_company_idx    on orders (company_id, created_at desc);
create index if not exists orders_status_idx     on orders (status);
create index if not exists order_events_order_idx on order_events (order_id, created_at);
create index if not exists sample_buyer_idx      on sample_requests (buyer_id, created_at desc);
create index if not exists sample_company_idx    on sample_requests (company_id, created_at desc);
create index if not exists certificates_company_idx on company_certificates (company_id);


-- ============ 20260901130000_growth_features.sql ============
-- ============================================================
-- Büyüme özellikleri
--   1. Toplu alım havuzu (MOQ birleştirme)
--   2. Fiyat / stok alarmları
--   3. Toplu import işleri
--   4. Ürün görüntülenme istatistiği
--   5. Bildirim tetikleyicileri
--   6. Tedarikçi performans karnesi (beyandan değil, veriden)
-- ============================================================

-- ============================================================
-- 1. TOPLU ALIM HAVUZU
--
-- Küçük perakendeci tek başına MOQ'ya ulaşamaz. Birkaç alıcı aynı ürün
-- için birleşip minimum sipariş miktarını doldurur. Segmentin en büyük
-- tıkanıklığı budur.
-- ============================================================

create table if not exists group_buys (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  initiator_id uuid not null references profiles(id) on delete cascade,
  target_quantity integer not null check (target_quantity > 0),
  -- Havuz dolduğunda geçerli olacak birim fiyat (kademeden türetilir).
  target_unit_price numeric(12,2) check (target_unit_price >= 0),
  currency text not null default 'TRY' references currencies(code),
  deadline date not null,
  status text not null default 'open'
    check (status in ('open', 'reached', 'ordered', 'expired', 'cancelled')),
  -- Katılımcı toplamı; tetikleyiciyle güncel tutulur.
  committed_quantity integer not null default 0 check (committed_quantity >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table group_buys enable row level security;

drop trigger if exists group_buys_touch on group_buys;
create trigger group_buys_touch before update on group_buys
  for each row execute function public.touch_updated_at();

create table if not exists group_buy_participants (
  id uuid primary key default gen_random_uuid(),
  group_buy_id uuid not null references group_buys(id) on delete cascade,
  buyer_id uuid not null references profiles(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (group_buy_id, buyer_id)
);

alter table group_buy_participants enable row level security;

/*
  Taahhüt toplamını ve havuzun durumunu tetikleyici yönetir. İstemciye
  bırakılsaydı yarış koşullarında yanlış toplam yazılabilirdi.
*/
create or replace function public.sync_group_buy_total()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  gid uuid := coalesce(new.group_buy_id, old.group_buy_id);
  total integer;
begin
  select coalesce(sum(quantity), 0) into total
    from public.group_buy_participants where group_buy_id = gid;

  update public.group_buys
     set committed_quantity = total,
         status = case
           when status in ('ordered', 'cancelled', 'expired') then status
           when total >= target_quantity then 'reached'
           else 'open'
         end
   where id = gid;

  return null;
end;
$$;

drop trigger if exists group_buy_participants_sync on group_buy_participants;
create trigger group_buy_participants_sync
  after insert or update or delete on group_buy_participants
  for each row execute function public.sync_group_buy_total();

create policy "group_buys_select_all" on group_buys
  for select using (status <> 'cancelled');

create policy "group_buys_insert_own" on group_buys
  for insert with check (initiator_id = (select auth.uid()));

create policy "group_buys_update_initiator" on group_buys
  for update using (initiator_id = (select auth.uid()) or public.is_admin())
  with check (initiator_id = (select auth.uid()) or public.is_admin());

create policy "group_buy_participants_select_all" on group_buy_participants
  for select using (true);

create policy "group_buy_participants_own" on group_buy_participants
  for all using (buyer_id = (select auth.uid()))
  with check (buyer_id = (select auth.uid()));

-- ============================================================
-- 2. FİYAT / STOK ALARMLARI
-- ============================================================

create table if not exists product_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  kind text not null check (kind in ('price_below', 'back_in_stock')),
  target_price numeric(12,2),
  active boolean not null default true,
  triggered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, product_id, kind)
);

alter table product_alerts enable row level security;

create policy "product_alerts_own" on product_alerts
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ============================================================
-- 3. TOPLU IMPORT İŞLERİ
-- ============================================================

create table if not exists import_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  created_by uuid not null references profiles(id) on delete cascade,
  filename text not null,
  total_rows integer not null default 0,
  ok_rows integer not null default 0,
  failed_rows integer not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  -- Satır bazlı hatalar: [{ row: 12, field: 'moq', message: '...' }]
  errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

alter table import_jobs enable row level security;

create policy "import_jobs_own_company" on import_jobs
  for all using (
    public.is_admin()
    or exists (select 1 from companies c where c.id = company_id and c.owner_id = (select auth.uid()))
  )
  with check (
    public.is_admin()
    or exists (select 1 from companies c where c.id = company_id and c.owner_id = (select auth.uid()))
  );

-- ============================================================
-- 4. ÜRÜN GÖRÜNTÜLENME (tedarikçi analitiği)
--
-- Ham olay yerine günlük toplam: tablo şişmez, tedarikçiye yeten
-- çözünürlük budur.
-- ============================================================

create table if not exists product_view_stats (
  product_id uuid not null references products(id) on delete cascade,
  day date not null default current_date,
  views integer not null default 0,
  primary key (product_id, day)
);

alter table product_view_stats enable row level security;

create policy "product_view_stats_select_owner" on product_view_stats
  for select using (
    public.is_admin()
    or exists (
      select 1 from products p join companies c on c.id = p.company_id
      where p.id = product_id and c.owner_id = (select auth.uid())
    )
  );

/*
  Sayacı RPC üzerinden artırırız: anonim ziyaretçinin tabloya doğrudan
  yazma yetkisi olmamalı, ama görüntülemesi sayılmalı.
*/
create or replace function public.track_product_view(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.product_view_stats (product_id, day, views)
  values (p_product_id, current_date, 1)
  on conflict (product_id, day)
  do update set views = product_view_stats.views + 1;
end;
$$;

revoke execute on function public.track_product_view(uuid) from public;
grant execute on function public.track_product_view(uuid) to anon, authenticated;

-- ============================================================
-- 5. BİLDİRİM TETİKLEYİCİLERİ
--
-- notifications tablosunda INSERT politikası yoktur; kayıtları yalnızca
-- bu SECURITY DEFINER tetikleyiciler üretir.
-- ============================================================

create or replace function public.notify(
  p_user_id uuid, p_type text, p_title text, p_body text, p_url text
) returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.notifications (user_id, type, title, body, url)
  values (p_user_id, p_type, p_title, p_body, p_url);
$$;

-- Yeni teklif → RFQ sahibine
create or replace function public.notify_new_quote()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  buyer uuid; rfq_title text; supplier_name text;
begin
  select r.buyer_id, r.title into buyer, rfq_title from public.rfqs r where r.id = new.rfq_id;
  select c.name into supplier_name from public.companies c where c.id = new.company_id;
  if buyer is not null and buyer <> auth.uid() then
    perform public.notify(buyer, 'quote.received', 'Yeni teklif aldınız',
      coalesce(supplier_name, 'Bir tedarikçi') || ' · ' || coalesce(rfq_title, ''),
      '/rfq/' || new.rfq_id);
  end if;
  return null;
end $$;

drop trigger if exists quotes_notify_new on quotes;
create trigger quotes_notify_new after insert on quotes
  for each row execute function public.notify_new_quote();

-- Teklif kabul/ret → teklifi veren firmanın sahibine
create or replace function public.notify_quote_decision()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  owner uuid;
begin
  if new.status is not distinct from old.status or new.status = 'pending' then
    return null;
  end if;
  select c.owner_id into owner from public.companies c where c.id = new.company_id;
  if owner is not null then
    perform public.notify(owner, 'quote.' || new.status,
      case when new.status = 'accepted' then 'Teklifiniz kabul edildi'
           else 'Teklifiniz reddedildi' end,
      null, '/rfq/' || new.rfq_id);
  end if;
  return null;
end $$;

drop trigger if exists quotes_notify_decision on quotes;
create trigger quotes_notify_decision after update on quotes
  for each row execute function public.notify_quote_decision();

-- Yeni mesaj → karşı tarafa
create or replace function public.notify_new_message()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  cv record; recipient uuid;
begin
  select * into cv from public.conversations where id = new.conversation_id;
  if cv.buyer_id = new.sender_id then
    select c.owner_id into recipient from public.companies c where c.id = cv.company_id;
  else
    recipient := cv.buyer_id;
  end if;
  if recipient is not null and recipient <> new.sender_id then
    perform public.notify(recipient, 'message.received', 'Yeni mesajınız var',
      left(new.body, 120), '/messages/' || new.conversation_id);
  end if;
  return null;
end $$;

drop trigger if exists messages_notify on messages;
create trigger messages_notify after insert on messages
  for each row execute function public.notify_new_message();

-- Sipariş durumu → karşı tarafa
create or replace function public.notify_order_status()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  owner uuid; target uuid;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return null;
  end if;
  select c.owner_id into owner from public.companies c where c.id = new.company_id;
  -- Durumu değiştiren kim ise diğerine haber ver.
  target := case when auth.uid() = new.buyer_id then owner else new.buyer_id end;
  if target is not null then
    perform public.notify(target, 'order.' || new.status,
      'Sipariş ' || new.code || ' güncellendi', new.status, '/orders/' || new.id);
  end if;
  return null;
end $$;

drop trigger if exists orders_notify_status on orders;
create trigger orders_notify_status after insert or update on orders
  for each row execute function public.notify_order_status();

-- Numune talebi → tedarikçiye
create or replace function public.notify_sample_request()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
declare owner uuid;
begin
  select c.owner_id into owner from public.companies c where c.id = new.company_id;
  if owner is not null then
    perform public.notify(owner, 'sample.requested', 'Yeni numune talebi', null, '/panel/samples');
  end if;
  return null;
end $$;

drop trigger if exists sample_requests_notify on sample_requests;
create trigger sample_requests_notify after insert on sample_requests
  for each row execute function public.notify_sample_request();

-- ============================================================
-- 6. TEDARİKÇİ PERFORMANS KARNESİ
--
-- response_rate / avg_response_hours elle girilebiliyordu — yani beyan.
-- Bu görünüm gerçek veriden hesaplar; firma profili bunu gösterir.
-- ============================================================

create or replace view public.company_performance
with (security_invoker = true) as
select
  c.id as company_id,
  (select count(*) from quotes q where q.company_id = c.id) as quotes_given,
  (select count(*) from quotes q where q.company_id = c.id and q.status = 'accepted') as quotes_accepted,
  (select count(*) from orders o where o.company_id = c.id and o.status = 'completed') as orders_completed,
  (select count(*) from orders o where o.company_id = c.id and o.status = 'cancelled') as orders_cancelled,
  (select count(*) from products p where p.company_id = c.id and p.status = 'active') as active_products
from companies c;

grant select on public.company_performance to anon, authenticated;

create index if not exists group_buys_product_idx on group_buys (product_id, status);
create index if not exists group_buy_participants_gb_idx on group_buy_participants (group_buy_id);
create index if not exists product_alerts_product_idx on product_alerts (product_id) where active;
create index if not exists import_jobs_company_idx on import_jobs (company_id, created_at desc);


-- ============ 20260901140000_fix_notification_urls.sql ============
-- ============================================================
-- Bildirim URL'leri KANONİK yol olmalı
--
-- notify_sample_request '/panel/samples' yazıyordu; bu Türkçe'ye
-- çevrilmiş yol. Uygulama kanonik yolu (/dashboard/samples) aktif dile
-- kendisi çevirir, dolayısıyla veritabanı daima kanonik olanı yazmalı.
-- Aksi halde İngilizce/Rusça kullanıcıda bağlantı kırılırdı.
-- ============================================================

create or replace function public.notify_sample_request()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
declare owner uuid;
begin
  select c.owner_id into owner from public.companies c where c.id = new.company_id;
  if owner is not null then
    perform public.notify(owner, 'sample.requested', 'Yeni numune talebi',
      null, '/dashboard/samples');
  end if;
  return null;
end $$;

-- Mevcut kayıtları da düzelt.
update notifications set url = '/dashboard/samples' where url = '/panel/samples';


-- ============ 20260901150000_reviews_moderation.sql ============
-- ============================================================
-- Yorum/puan ve moderasyon
--   1. Değerlendirmeler — YALNIZCA tamamlanmış siparişe dayanır
--   2. Firma puan özeti (denormalize, tetikleyiciyle güncel)
--   3. Raporlama / moderasyon
-- ============================================================

-- ============================================================
-- 1. DEĞERLENDİRMELER
--
-- B2B'de itibarın değerli olması için doğrulanabilir olması gerekir.
-- Bu yüzden yorum serbestçe yazılamaz: yalnızca TAMAMLANMIŞ bir
-- siparişin alıcısı, o sipariş için tek yorum bırakabilir.
-- ============================================================

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  -- Sipariş başına tek yorum: aynı işlemden itibar üretilemesin.
  order_id uuid not null unique references orders(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  -- Alt kırılımlar: B2B'de "5 yıldız" tek başına bilgi vermez.
  quality_rating smallint check (quality_rating between 1 and 5),
  delivery_rating smallint check (delivery_rating between 1 and 5),
  communication_rating smallint check (communication_rating between 1 and 5),
  comment text check (comment is null or length(btrim(comment)) >= 10),
  reply text,
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table reviews enable row level security;

drop trigger if exists reviews_touch on reviews;
create trigger reviews_touch before update on reviews
  for each row execute function public.touch_updated_at();

/*
  Yorumun gerçekten tamamlanmış bir işleme dayandığını veritabanı
  garanti eder. RLS'e bırakılsaydı politika ifadesi çok karmaşıklaşırdı;
  tetikleyici hem daha okunur hem de daha net hata verir.
*/
create or replace function public.enforce_review_integrity()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  o record;
begin
  select * into o from public.orders where id = new.order_id;

  if o is null then
    raise exception 'Sipariş bulunamadı' using errcode = 'foreign_key_violation';
  end if;
  if o.status <> 'completed' then
    raise exception 'Yalnızca tamamlanmış sipariş değerlendirilebilir'
      using errcode = 'check_violation';
  end if;
  if not public.is_service_context() and o.buyer_id <> auth.uid() then
    raise exception 'Yalnızca siparişin alıcısı değerlendirebilir'
      using errcode = 'insufficient_privilege';
  end if;

  -- Yorumun hedefi siparişten türetilir; istemci gönderse bile yok sayılır.
  new.company_id := o.company_id;
  new.author_id  := o.buyer_id;
  return new;
end;
$$;

drop trigger if exists reviews_enforce_integrity on reviews;
create trigger reviews_enforce_integrity
  before insert on reviews
  for each row execute function public.enforce_review_integrity();

-- Yanıtı yalnızca tedarikçi yazabilir, puana dokunamaz.
create or replace function public.protect_review_columns()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  is_supplier boolean;
begin
  if public.is_admin() or public.is_service_context() then
    return new;
  end if;

  select exists (
    select 1 from public.companies c
    where c.id = old.company_id and c.owner_id = auth.uid()
  ) into is_supplier;

  if is_supplier then
    -- Tedarikçi yalnızca yanıt ekler.
    new.rating               := old.rating;
    new.quality_rating       := old.quality_rating;
    new.delivery_rating      := old.delivery_rating;
    new.communication_rating := old.communication_rating;
    new.comment              := old.comment;
    if new.reply is distinct from old.reply then
      new.replied_at := now();
    end if;
  else
    -- Alıcı yanıta dokunamaz.
    new.reply      := old.reply;
    new.replied_at := old.replied_at;
  end if;

  new.order_id   := old.order_id;
  new.company_id := old.company_id;
  new.author_id  := old.author_id;
  return new;
end;
$$;

drop trigger if exists reviews_protect on reviews;
create trigger reviews_protect before update on reviews
  for each row execute function public.protect_review_columns();

-- ============================================================
-- 2. FİRMA PUAN ÖZETİ
--
-- Liste sayfalarında her firma için ortalama hesaplamak pahalı;
-- denormalize edip tetikleyiciyle güncel tutuyoruz.
-- ============================================================

alter table companies
  add column if not exists rating_average numeric(3,2)
    check (rating_average is null or rating_average between 1 and 5),
  add column if not exists rating_count integer not null default 0
    check (rating_count >= 0);

create or replace function public.sync_company_rating()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  cid uuid := coalesce(new.company_id, old.company_id);
begin
  update public.companies c
     set rating_average = sub.avg_rating,
         rating_count   = sub.n
    from (
      select round(avg(rating)::numeric, 2) as avg_rating, count(*) as n
        from public.reviews where company_id = cid
    ) sub
   where c.id = cid;
  return null;
end;
$$;

drop trigger if exists reviews_sync_rating on reviews;
create trigger reviews_sync_rating
  after insert or update or delete on reviews
  for each row execute function public.sync_company_rating();

-- ============================================================
-- 3. RAPORLAMA / MODERASYON
-- ============================================================

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  -- Tam olarak bir hedef
  product_id uuid references products(id) on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  rfq_id uuid references rfqs(id) on delete cascade,
  review_id uuid references reviews(id) on delete cascade,
  reason text not null check (reason in
    ('spam', 'counterfeit', 'misleading', 'offensive', 'wrong_category', 'other')),
  detail text,
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  resolution_note text,
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint reports_single_target check (
    (product_id is not null)::int + (company_id is not null)::int
    + (rfq_id is not null)::int + (review_id is not null)::int = 1
  )
);

alter table reports enable row level security;

-- Aynı kişi aynı hedefi tekrar tekrar raporlayıp kuyruğu şişiremesin.
create unique index if not exists reports_unique_product
  on reports (reporter_id, product_id) where product_id is not null;
create unique index if not exists reports_unique_company
  on reports (reporter_id, company_id) where company_id is not null;
create unique index if not exists reports_unique_rfq
  on reports (reporter_id, rfq_id) where rfq_id is not null;
create unique index if not exists reports_unique_review
  on reports (reporter_id, review_id) where review_id is not null;

-- ============================================================
-- 4. RLS
-- ============================================================

-- Değerlendirmeler herkese açık okunur: alıcı karar verirken görmeli.
create policy "reviews_select_all" on reviews for select using (true);

create policy "reviews_insert_buyer" on reviews
  for insert with check (
    exists (
      select 1 from orders o
      where o.id = order_id
        and o.buyer_id = (select auth.uid())
        and o.status = 'completed'
    )
  );

create policy "reviews_update_parties" on reviews
  for update using (
    public.is_admin()
    or author_id = (select auth.uid())
    or exists (select 1 from companies c where c.id = company_id and c.owner_id = (select auth.uid()))
  )
  with check (
    public.is_admin()
    or author_id = (select auth.uid())
    or exists (select 1 from companies c where c.id = company_id and c.owner_id = (select auth.uid()))
  );

create policy "reviews_delete_admin" on reviews
  for delete using (public.is_admin());

-- Raporu yalnızca sahibi ve admin görür; suçlanan taraf göremez.
create policy "reports_select_own_or_admin" on reports
  for select using (reporter_id = (select auth.uid()) or public.is_admin());

create policy "reports_insert_own" on reports
  for insert with check (reporter_id = (select auth.uid()));

create policy "reports_update_admin" on reports
  for update using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 5. INDEKSLER + BİLDİRİM
-- ============================================================

create index if not exists reviews_company_idx on reviews (company_id, created_at desc);
create index if not exists reports_status_idx on reports (status, created_at desc);

-- Yeni değerlendirme → tedarikçiye
create or replace function public.notify_new_review()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
declare owner uuid;
begin
  select c.owner_id into owner from public.companies c where c.id = new.company_id;
  if owner is not null then
    perform public.notify(owner, 'review.received', 'Yeni değerlendirme aldınız',
      new.rating || '/5', '/dashboard/company');
  end if;
  return null;
end $$;

drop trigger if exists reviews_notify on reviews;
create trigger reviews_notify after insert on reviews
  for each row execute function public.notify_new_review();


-- ============ 20260901160000_account_types.sql ============
-- ============================================================
-- Hesap tipleri ve profil doğrulamaları
--
-- Sorun: profiles.role yalnızca buyer|supplier|admin. Gerçekte bir
-- toptancı aynı zamanda alım da yapar; ayrıca "toptancı" ve
-- "perakendeci" ayrımı panelin hangi araçları göstereceğini belirler.
--
-- Çözüm: 'both' rolü + profil üzerinde doğrulama alanları. Tüm
-- doğrulamalar kayıt sırasında değil, profil sayfasından yapılır —
-- kayıt formu iki alana iner.
-- ============================================================

-- ---- Rol: 'both' eklendi ----
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('buyer', 'supplier', 'both', 'admin'));

comment on column profiles.role is
  'buyer = perakendeci (alır), supplier = toptancı (satar), both = ikisi, admin';

-- ---- Profil: kişisel bilgi ve doğrulama durumu ----
alter table profiles
  add column if not exists job_title text,
  add column if not exists phone_verified boolean not null default false,
  -- Kullanıcının arayüz tercihi; role 'both' ise hangi paneli açacağı.
  add column if not exists preferred_panel text
    check (preferred_panel is null or preferred_panel in ('buyer', 'supplier'));

/*
  phone_verified'i kullanıcı kendi yazamaz — doğrulama OTP akışıyla
  yapılır. role de kayıt sonrası serbestçe değiştirilebilir olmalı
  (perakendeci sonradan toptancı da olabilir), ama admin'e yükselme
  hâlâ yasak.
*/
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if public.is_admin() or public.is_service_context() then
    return new;
  end if;

  -- Kimse kendini admin yapamaz; admin de kendi rolünü düşüremez.
  if new.role = 'admin' and old.role <> 'admin' then
    new.role := old.role;
  end if;
  if old.role = 'admin' and new.role <> 'admin' then
    new.role := old.role;
  end if;

  -- Telefon doğrulaması yalnızca OTP akışıyla (service_role) verilir.
  new.phone_verified := old.phone_verified;
  -- Telefon değişirse doğrulama düşer.
  if new.phone is distinct from old.phone then
    new.phone_verified := false;
  end if;

  return new;
end;
$$;

-- ---- Firma: resmî kimlik bilgileri ----
alter table companies
  add column if not exists tax_office text,
  add column if not exists trade_registry_no text,
  add column if not exists mersis_no text,
  add column if not exists employee_count text
    check (employee_count is null or employee_count in
      ('1-9', '10-49', '50-249', '250+')),
  add column if not exists founded_year smallint
    check (founded_year is null or founded_year between 1900 and 2100);

-- ============================================================
-- DOĞRULAMA TALEPLERİ
--
-- company_verifications zaten vardı ama arayüzü yoktu ve admin paneli
-- doğrudan companies.verified'a bakıyordu. Artık akış talep üzerinden
-- işler: firma talep açar, admin karara bağlar, onay rozeti yazar.
-- ============================================================

alter table company_verifications
  add column if not exists requested_by uuid references profiles(id) on delete set null,
  add column if not exists documents text[] not null default '{}';

-- Bir firmanın aynı anda tek bekleyen talebi olabilir.
create unique index if not exists company_verifications_one_pending
  on company_verifications (company_id) where status = 'pending';

/*
  Admin talebi onayladığında firmanın rozeti otomatik verilir.
  Elle iki ayrı işlem yapılsaydı "onaylandı ama rozet yok" durumu
  oluşabilirdi.
*/
create or replace function public.apply_verification_decision()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = old.status then
    return null;
  end if;

  if new.status = 'approved' then
    update public.companies
       set verified = true,
           verified_at = now(),
           verified_by = new.reviewed_by
     where id = new.company_id;
  elsif new.status = 'rejected' then
    update public.companies
       set verified = false, verified_at = null, verified_by = null
     where id = new.company_id;
  end if;

  -- Firmanın sahibine haber ver.
  perform public.notify(
    (select owner_id from public.companies where id = new.company_id),
    'verification.' || new.status,
    case when new.status = 'approved'
      then 'Firmanız doğrulandı' else 'Doğrulama talebiniz sonuçlandı' end,
    new.note,
    '/dashboard/company'
  );

  return null;
end;
$$;

drop trigger if exists verifications_apply_decision on company_verifications;
create trigger verifications_apply_decision
  after update on company_verifications
  for each row execute function public.apply_verification_decision();

-- Talebi firma sahibi açar; durumunu yalnızca admin değiştirir.
create or replace function public.protect_verification_request()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if public.is_admin() or public.is_service_context() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.reviewed_by := null;
    new.reviewed_at := null;
  else
    new.status := old.status;
    new.reviewed_by := old.reviewed_by;
    new.reviewed_at := old.reviewed_at;
  end if;
  return new;
end;
$$;

drop trigger if exists verifications_protect on company_verifications;
create trigger verifications_protect
  before insert or update on company_verifications
  for each row execute function public.protect_verification_request();

-- ---- handle_new_user: yeni rolü de kabul etsin ----
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  requested_role text;
begin
  requested_role := coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'buyer');
  -- Kayıt sırasında admin seçilemez.
  if requested_role not in ('buyer', 'supplier', 'both') then
    requested_role := 'buyer';
  end if;

  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'phone', ''), new.phone),
    requested_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create index if not exists profiles_role_idx on profiles (role);


-- ============ 20260901170000_manufacturer_profile.sql ============
-- ============================================================
-- Üretici profili — ana sayfadaki "Doğrulanmış Üreticiler" bloğu için
--
-- Bu alanlar OPSİYONELDİR ve yalnızca tedarikçi doldurduğunda gösterilir.
-- Boşken uydurma değer göstermek yerine alan hiç render edilmez.
-- ============================================================

alter table companies
  add column if not exists company_kind text not null default 'trader'
    check (company_kind in ('manufacturer', 'trader', 'both')),
  -- "50.000 adet/ay" gibi serbest metin: birim sektöre göre değişir
  add column if not exists production_capacity text,
  -- ISO 3166-1 alpha-2 kodları
  add column if not exists export_countries text[] not null default '{}',
  add column if not exists min_order_note text,
  add column if not exists factory_tour_url text;

comment on column companies.company_kind is
  'manufacturer = üretici/fabrika, trader = toptancı/tedarikçi, both = ikisi';

create index if not exists companies_kind_idx on companies (company_kind)
  where company_kind in ('manufacturer', 'both');

-- Ziyaretçinin para birimi tercihi profilde saklanır; anonim kullanıcı
-- için çerez kullanılır (sunucuya yazacak bir kimlik yok).
alter table profiles
  add column if not exists preferred_currency text
    references currencies(code);


-- ============ 20260901180000_hs_code_search.sql ============
-- ============================================================
-- GTİP/HS kodu araması
--
-- Kod veritabanında "4819.10" gibi noktalı saklanıyor ama alıcı
-- "481910" da yazabiliyor. İki biçimi de yakalamak için normalize
-- edilmiş (yalnızca rakam) türetilmiş kolon üzerinden arıyoruz.
-- ============================================================

alter table products
  add column if not exists hs_code_digits text
    generated always as (
      nullif(regexp_replace(coalesce(hs_code, ''), '[^0-9]', '', 'g'), '')
    ) stored;

create index if not exists products_hs_digits_idx
  on products (hs_code_digits text_pattern_ops);


-- ============ 20260901190000_catalog_depth.sql ============
-- ============================================================
-- Katalog derinliği: üretim tipi, hacim ve varyant matrisi
--
-- Listeleme ve ürün detay spec'inin veri karşılığı olmayan üç
-- ihtiyacını karşılar:
--   1. OEM / ODM / hazır stok ayrımı (alıcının ilk elediği kriter)
--   2. Koli hacmi — konteyner/palet hesabının tek gerçek girdisi
--   3. Beden×Renk sipariş matrisi (perakendeci tek tek sepete eklemez)
-- ============================================================

-- ---------- 1. Üretim yetkinliği ----------
alter table products
  add column if not exists production_type text
    check (production_type is null or production_type in ('oem', 'odm', 'stock'));

comment on column products.production_type is
  'oem: alıcının markasıyla üretim · odm: üreticinin tasarımı, alıcının etiketi · stock: hazır stok, anında sevk';

-- ---------- 2. Hacim ve ağırlık ----------
-- Konteyner doluluğu yalnızca koli hacmiyle hesaplanabilir.
-- units_per_case ve cases_per_pallet zaten var; eksik olan m³.
alter table products
  add column if not exists case_volume_m3 numeric(10, 4)
    check (case_volume_m3 is null or case_volume_m3 > 0),
  add column if not exists case_weight_kg numeric(10, 3)
    check (case_weight_kg is null or case_weight_kg > 0);

-- ---------- 3. Varyant matrisi ----------
-- İki eksen yeterlidir (Renk × Beden, Gramaj × En, Kalınlık × Boy).
-- Eksen ADLARI üründe, DEĞERLERİ satırlarda durur; böylece her ürün
-- kendi terminolojisini kullanır.
alter table products
  add column if not exists variant_axis1_name text,
  add column if not exists variant_axis2_name text;

create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  axis1_value text not null,
  axis2_value text,
  sku text,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  -- Matris fiyatı ürünün kademeli fiyatından türer; sapma varsa fark.
  price_delta numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  unique (product_id, axis1_value, axis2_value)
);

alter table product_variants enable row level security;

create index if not exists product_variants_product_idx
  on product_variants (product_id);

-- Görünürlük kuralı price_tiers ile aynı: ürün yayındaysa herkese açık,
-- değilse yalnızca sahibine.
drop policy if exists "product_variants_select_public" on product_variants;
create policy "product_variants_select_public" on product_variants
  for select using (
    exists (
      select 1 from products p
      where p.id = product_id
        and (p.status = 'active' or p.company_id in (
          select c.id from companies c where c.owner_id = (select auth.uid())
        ))
    )
  );

drop policy if exists "product_variants_write_own" on product_variants;
create policy "product_variants_write_own" on product_variants
  for all using (
    public.is_admin()
    or exists (
      select 1 from products p
      join companies c on c.id = p.company_id
      where p.id = product_id and c.owner_id = (select auth.uid())
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from products p
      join companies c on c.id = p.company_id
      where p.id = product_id and c.owner_id = (select auth.uid())
    )
  );

-- ---------- 4. Sıralanabilir kapasite ----------
-- production_capacity serbest metin ("aylık 200 bin adet"); sıralama
-- yapılamıyor. Sayısal alan ekleniyor, metin açıklama olarak kalıyor.
alter table companies
  add column if not exists annual_output_units bigint
    check (annual_output_units is null or annual_output_units >= 0);

-- ---------- 5. Filtre indeksleri ----------
-- Sol paneldeki her filtre bir where koşuluna dönüşüyor; yayındaki
-- ürünler üzerinde kısmi indeks yeterli.
create index if not exists products_production_type_idx
  on products (production_type) where status = 'active';
create index if not exists products_incoterm_idx
  on products (incoterm) where status = 'active';
create index if not exists products_lead_time_idx
  on products (lead_time_days) where status = 'active';
create index if not exists products_price_idx
  on products (price) where status = 'active' and price_hidden = false;
create index if not exists company_certificates_kind_idx
  on company_certificates (kind, company_id);

-- ---------- 6. Sertifika kümesi ----------
-- Tekstil ve gıda ihracatında alıcının ilk sorduğu belgeler listede
-- yoktu; sertifika filtresi onlarsız eksik kalırdı.
alter table company_certificates
  drop constraint if exists company_certificates_kind_check;
alter table company_certificates
  add constraint company_certificates_kind_check check (kind in (
    'iso', 'ce', 'tse', 'halal', 'organic', 'gmp', 'fsc', 'reach',
    'oeko_tex', 'bsci', 'gots', 'fda', 'brc', 'sedex',
    'other'
  ));


-- ============ 20260901200000_negotiation_terms.sql ============
-- ============================================================
-- Çok parametreli pazarlık
--
-- B2B'yi perakendeden ayıran şey, pazarlığın yalnızca FİYAT üzerinden
-- yapılmaması. Taraflar termin, peşinat oranı, vade, teslim şekli ve
-- kabul edilebilir defo oranını birlikte pazarlık eder; birinde verilen
-- taviz diğerinden alınır.
--
-- quote_revisions bu turların kaydıdır, quotes ise yürürlükteki teklif.
-- İkisine de aynı alanlar ekleniyor ki her turun tam anlaşma önerisi
-- geriye dönük okunabilsin.
--
-- Ödeme şartı BİLEREK "peşinat yüzdesi + vade günü" olarak modellendi:
-- escrow ve BNPL platformda yok; olmayan bir finansal ürünü şemaya
-- yazmak, arayüzde de vaat edilmesine yol açar.
-- ============================================================

do $$
declare
  t text;
begin
  foreach t in array array['quotes', 'quote_revisions'] loop
    execute format($f$
      alter table %I
        add column if not exists incoterm text
          check (incoterm is null or incoterm in (
            'EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP'
          )),
        add column if not exists advance_pct smallint
          check (advance_pct is null or advance_pct between 0 and 100),
        add column if not exists payment_days smallint
          check (payment_days is null or payment_days between 0 and 365),
        add column if not exists defect_tolerance_pct numeric(5, 2)
          check (defect_tolerance_pct is null
                 or defect_tolerance_pct between 0 and 100)
    $f$, t);
  end loop;
end
$$;

comment on column quotes.advance_pct is
  'Peşin ödenecek yüzde; kalanı payment_days gün vadeli. Escrow/BNPL değildir.';
comment on column quotes.defect_tolerance_pct is
  'Alıcının kabul ettiği azami defo oranı. Kalite anlaşmazlığının ölçüsü.';

-- ---------- Anlaşma anı ----------
-- Teklif kabul edildiğinde yürürlükteki şartların donduğu an. Sözleşme
-- metni bu andan üretilir; sonraki düzenlemeler yeni bir tur açar.
alter table quotes
  add column if not exists agreed_at timestamptz;

/*
  Kabul edilen teklifin şartları donmalı: kabul sonrası tedarikçinin
  fiyatı değiştirebilmesi, alıcının kabul ettiği şeyden farklı bir
  siparişe yol açardı. Uygulama katmanı bunu zaten engelliyor ama
  tek savunma hattı olarak bırakılamaz.
*/
create or replace function public.freeze_agreed_quote()
returns trigger
language plpgsql
as $$
begin
  if old.agreed_at is not null then
    if new.price is distinct from old.price
      or new.moq is distinct from old.moq
      or new.delivery_days is distinct from old.delivery_days
      or new.incoterm is distinct from old.incoterm
      or new.advance_pct is distinct from old.advance_pct
      or new.payment_days is distinct from old.payment_days
      or new.defect_tolerance_pct is distinct from old.defect_tolerance_pct
    then
      raise exception
        'Anlaşmaya varılmış teklifin şartları değiştirilemez (quote %).', old.id;
    end if;
  end if;
  return new;
end
$$;

-- SECURITY DEFINER YOK: koruma tetiği çağıranın yetkisiyle çalışmalı.
drop trigger if exists quotes_freeze_agreed on quotes;
create trigger quotes_freeze_agreed
  before update on quotes
  for each row execute function public.freeze_agreed_quote();

-- ---------- Sipariş, pazarlıkta anlaşılanı taşır ----------
alter table orders
  add column if not exists advance_pct smallint
    check (advance_pct is null or advance_pct between 0 and 100),
  add column if not exists payment_days smallint
    check (payment_days is null or payment_days between 0 and 365),
  add column if not exists defect_tolerance_pct numeric(5, 2)
    check (defect_tolerance_pct is null
           or defect_tolerance_pct between 0 and 100);

create index if not exists quotes_agreed_idx on quotes (agreed_at)
  where agreed_at is not null;


-- ============ 20260901210000_geo_reference.sql ============
-- ============================================================
-- Coğrafi referans: ülkeler, iller, ilçeler
--
-- Adres alanları serbest metindi: "İstanbul", "istanbul", "Istanbul" ve
-- "İSTANBUL" ayrı şehirler sayılıyordu. Şehir filtresi bu yüzden hem
-- eksik hem gürültülü sonuç veriyordu.
--
-- Kaynaklar (bir kez çekilip buraya gömüldü; çalışma zamanında ağ
-- bağımlılığı YOK):
--   iller/ilçeler : https://turkiyeapi.dev/api/v1/provinces  (81 il, 973 ilçe)
--   ülke adları   : github.com/umpirsky/country-list (en, tr, ru)
--
-- regions tablosu tek düzey ağaçtır (il → ilçe) ve country_code ile
-- başka ülkelere genişleyebilir; ihracat pazarları eklenecekse şema
-- değişikliği gerekmez.
-- ============================================================

create table if not exists countries (
  code        char(2) primary key,
  name_tr     text not null,
  name_en     text not null,
  name_ru     text not null,
  -- Türkiye listenin başında dursun; gerisi ada göre sıralanır.
  sort_order  smallint not null default 100
);

create table if not exists regions (
  id           uuid primary key default gen_random_uuid(),
  country_code char(2) not null references countries(code) on delete cascade,
  parent_id    uuid references regions(id) on delete cascade,
  level        smallint not null check (level in (1, 2)),
  -- İl için plaka kodu; ilçede boş.
  code         text,
  name         text not null,
  unique (country_code, level, parent_id, name)
);

comment on column regions.level is '1 = il / eyalet, 2 = ilçe';

create index if not exists regions_lookup_idx
  on regions (country_code, level, parent_id);
create index if not exists regions_parent_idx on regions (parent_id);

-- Referans veridir: herkes okur, yalnızca yönetici yazar.
alter table countries enable row level security;
alter table regions enable row level security;

drop policy if exists "countries_read_all" on countries;
create policy "countries_read_all" on countries for select using (true);
drop policy if exists "countries_admin_write" on countries;
create policy "countries_admin_write" on countries for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "regions_read_all" on regions;
create policy "regions_read_all" on regions for select using (true);
drop policy if exists "regions_admin_write" on regions;
create policy "regions_admin_write" on regions for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------- Ülkeler ----------
insert into countries (code, name_tr, name_en, name_ru, sort_order) values
  ('AD', 'Andorra', 'Andorra', 'Андорра', 100),
  ('AE', 'Birleşik Arap Emirlikleri', 'United Arab Emirates', 'ОАЭ', 100),
  ('AF', 'Afganistan', 'Afghanistan', 'Афганистан', 100),
  ('AG', 'Antigua ve Barbuda', 'Antigua & Barbuda', 'Антигуа и Барбуда', 100),
  ('AI', 'Anguilla', 'Anguilla', 'Ангилья', 100),
  ('AL', 'Arnavutluk', 'Albania', 'Албания', 100),
  ('AM', 'Ermenistan', 'Armenia', 'Армения', 100),
  ('AO', 'Angola', 'Angola', 'Ангола', 100),
  ('AQ', 'Antarktika', 'Antarctica', 'Антарктида', 100),
  ('AR', 'Arjantin', 'Argentina', 'Аргентина', 100),
  ('AS', 'Amerikan Samoası', 'American Samoa', 'Американское Самоа', 100),
  ('AT', 'Avusturya', 'Austria', 'Австрия', 100),
  ('AU', 'Avustralya', 'Australia', 'Австралия', 100),
  ('AW', 'Aruba', 'Aruba', 'Аруба', 100),
  ('AX', 'Åland Adaları', 'Åland Islands', 'Аландские о-ва', 100),
  ('AZ', 'Azerbaycan', 'Azerbaijan', 'Азербайджан', 100),
  ('BA', 'Bosna-Hersek', 'Bosnia & Herzegovina', 'Босния и Герцеговина', 100),
  ('BB', 'Barbados', 'Barbados', 'Барбадос', 100),
  ('BD', 'Bangladeş', 'Bangladesh', 'Бангладеш', 100),
  ('BE', 'Belçika', 'Belgium', 'Бельгия', 100),
  ('BF', 'Burkina Faso', 'Burkina Faso', 'Буркина-Фасо', 100),
  ('BG', 'Bulgaristan', 'Bulgaria', 'Болгария', 100),
  ('BH', 'Bahreyn', 'Bahrain', 'Бахрейн', 100),
  ('BI', 'Burundi', 'Burundi', 'Бурунди', 100),
  ('BJ', 'Benin', 'Benin', 'Бенин', 100),
  ('BL', 'Saint Barthelemy', 'St. Barthélemy', 'Сен-Бартелеми', 100),
  ('BM', 'Bermuda', 'Bermuda', 'Бермудские о-ва', 100),
  ('BN', 'Brunei', 'Brunei', 'Бруней-Даруссалам', 100),
  ('BO', 'Bolivya', 'Bolivia', 'Боливия', 100),
  ('BQ', 'Karayip Hollandası', 'Caribbean Netherlands', 'Бонэйр, Синт-Эстатиус и Саба', 100),
  ('BR', 'Brezilya', 'Brazil', 'Бразилия', 100),
  ('BS', 'Bahamalar', 'Bahamas', 'Багамы', 100),
  ('BT', 'Butan', 'Bhutan', 'Бутан', 100),
  ('BV', 'Bouvet Adası', 'Bouvet Island', 'о-в Буве', 100),
  ('BW', 'Botsvana', 'Botswana', 'Ботсвана', 100),
  ('BY', 'Belarus', 'Belarus', 'Беларусь', 100),
  ('BZ', 'Belize', 'Belize', 'Белиз', 100),
  ('CA', 'Kanada', 'Canada', 'Канада', 100),
  ('CC', 'Cocos (Keeling) Adaları', 'Cocos (Keeling) Islands', 'Кокосовые о-ва', 100),
  ('CD', 'Kongo - Kinşasa', 'Congo - Kinshasa', 'Конго - Киншаса', 100),
  ('CF', 'Orta Afrika Cumhuriyeti', 'Central African Republic', 'Центрально-Африканская Республика', 100),
  ('CG', 'Kongo - Brazavil', 'Congo - Brazzaville', 'Конго - Браззавиль', 100),
  ('CH', 'İsviçre', 'Switzerland', 'Швейцария', 100),
  ('CI', 'Côte d’Ivoire', 'Côte d’Ivoire', 'Кот-д’Ивуар', 100),
  ('CK', 'Cook Adaları', 'Cook Islands', 'Острова Кука', 100),
  ('CL', 'Şili', 'Chile', 'Чили', 100),
  ('CM', 'Kamerun', 'Cameroon', 'Камерун', 100),
  ('CN', 'Çin', 'China', 'Китай', 100),
  ('CO', 'Kolombiya', 'Colombia', 'Колумбия', 100),
  ('CR', 'Kosta Rika', 'Costa Rica', 'Коста-Рика', 100),
  ('CU', 'Küba', 'Cuba', 'Куба', 100),
  ('CV', 'Cape Verde', 'Cape Verde', 'Кабо-Верде', 100),
  ('CW', 'Curaçao', 'Curaçao', 'Кюрасао', 100),
  ('CX', 'Christmas Adası', 'Christmas Island', 'о-в Рождества', 100),
  ('CY', 'Kıbrıs', 'Cyprus', 'Кипр', 100),
  ('CZ', 'Çekya', 'Czechia', 'Чехия', 100),
  ('DE', 'Almanya', 'Germany', 'Германия', 100),
  ('DJ', 'Cibuti', 'Djibouti', 'Джибути', 100),
  ('DK', 'Danimarka', 'Denmark', 'Дания', 100),
  ('DM', 'Dominika', 'Dominica', 'Доминика', 100),
  ('DO', 'Dominik Cumhuriyeti', 'Dominican Republic', 'Доминиканская Республика', 100),
  ('DZ', 'Cezayir', 'Algeria', 'Алжир', 100),
  ('EC', 'Ekvador', 'Ecuador', 'Эквадор', 100),
  ('EE', 'Estonya', 'Estonia', 'Эстония', 100),
  ('EG', 'Mısır', 'Egypt', 'Египет', 100),
  ('EH', 'Batı Sahra', 'Western Sahara', 'Западная Сахара', 100),
  ('ER', 'Eritre', 'Eritrea', 'Эритрея', 100),
  ('ES', 'İspanya', 'Spain', 'Испания', 100),
  ('ET', 'Etiyopya', 'Ethiopia', 'Эфиопия', 100),
  ('FI', 'Finlandiya', 'Finland', 'Финляндия', 100),
  ('FJ', 'Fiji', 'Fiji', 'Фиджи', 100),
  ('FK', 'Falkland Adaları', 'Falkland Islands', 'Фолклендские о-ва', 100),
  ('FM', 'Mikronezya', 'Micronesia', 'Федеративные Штаты Микронезии', 100),
  ('FO', 'Faroe Adaları', 'Faroe Islands', 'Фарерские о-ва', 100),
  ('FR', 'Fransa', 'France', 'Франция', 100),
  ('GA', 'Gabon', 'Gabon', 'Габон', 100),
  ('GB', 'Birleşik Krallık', 'United Kingdom', 'Великобритания', 100),
  ('GD', 'Grenada', 'Grenada', 'Гренада', 100),
  ('GE', 'Gürcistan', 'Georgia', 'Грузия', 100),
  ('GF', 'Fransız Guyanası', 'French Guiana', 'Французская Гвиана', 100),
  ('GG', 'Guernsey', 'Guernsey', 'Гернси', 100),
  ('GH', 'Gana', 'Ghana', 'Гана', 100),
  ('GI', 'Cebelitarık', 'Gibraltar', 'Гибралтар', 100),
  ('GL', 'Grönland', 'Greenland', 'Гренландия', 100),
  ('GM', 'Gambiya', 'Gambia', 'Гамбия', 100),
  ('GN', 'Gine', 'Guinea', 'Гвинея', 100),
  ('GP', 'Guadeloupe', 'Guadeloupe', 'Гваделупа', 100),
  ('GQ', 'Ekvator Ginesi', 'Equatorial Guinea', 'Экваториальная Гвинея', 100),
  ('GR', 'Yunanistan', 'Greece', 'Греция', 100),
  ('GS', 'Güney Georgia ve Güney Sandwich Adaları', 'South Georgia & South Sandwich Islands', 'Южная Георгия и Южные Сандвичевы о-ва', 100),
  ('GT', 'Guatemala', 'Guatemala', 'Гватемала', 100),
  ('GU', 'Guam', 'Guam', 'Гуам', 100),
  ('GW', 'Gine-Bissau', 'Guinea-Bissau', 'Гвинея-Бисау', 100),
  ('GY', 'Guyana', 'Guyana', 'Гайана', 100),
  ('HK', 'Çin Hong Kong ÖİB', 'Hong Kong SAR China', 'Гонконг (САР)', 100),
  ('HM', 'Heard Adası ve McDonald Adaları', 'Heard & McDonald Islands', 'о-ва Херд и Макдональд', 100),
  ('HN', 'Honduras', 'Honduras', 'Гондурас', 100),
  ('HR', 'Hırvatistan', 'Croatia', 'Хорватия', 100),
  ('HT', 'Haiti', 'Haiti', 'Гаити', 100),
  ('HU', 'Macaristan', 'Hungary', 'Венгрия', 100),
  ('ID', 'Endonezya', 'Indonesia', 'Индонезия', 100),
  ('IE', 'İrlanda', 'Ireland', 'Ирландия', 100),
  ('IL', 'İsrail', 'Israel', 'Израиль', 100),
  ('IM', 'Man Adası', 'Isle of Man', 'о-в Мэн', 100),
  ('IN', 'Hindistan', 'India', 'Индия', 100),
  ('IO', 'Britanya Hint Okyanusu Toprakları', 'British Indian Ocean Territory', 'Британская территория в Индийском океане', 100),
  ('IQ', 'Irak', 'Iraq', 'Ирак', 100),
  ('IR', 'İran', 'Iran', 'Иран', 100),
  ('IS', 'İzlanda', 'Iceland', 'Исландия', 100),
  ('IT', 'İtalya', 'Italy', 'Италия', 100),
  ('JE', 'Jersey', 'Jersey', 'Джерси', 100),
  ('JM', 'Jamaika', 'Jamaica', 'Ямайка', 100),
  ('JO', 'Ürdün', 'Jordan', 'Иордания', 100),
  ('JP', 'Japonya', 'Japan', 'Япония', 100),
  ('KE', 'Kenya', 'Kenya', 'Кения', 100),
  ('KG', 'Kırgızistan', 'Kyrgyzstan', 'Киргизия', 100),
  ('KH', 'Kamboçya', 'Cambodia', 'Камбоджа', 100),
  ('KI', 'Kiribati', 'Kiribati', 'Кирибати', 100),
  ('KM', 'Komorlar', 'Comoros', 'Коморы', 100),
  ('KN', 'Saint Kitts ve Nevis', 'St. Kitts & Nevis', 'Сент-Китс и Невис', 100),
  ('KP', 'Kuzey Kore', 'North Korea', 'КНДР', 100),
  ('KR', 'Güney Kore', 'South Korea', 'Республика Корея', 100),
  ('KW', 'Kuveyt', 'Kuwait', 'Кувейт', 100),
  ('KY', 'Cayman Adaları', 'Cayman Islands', 'Острова Кайман', 100),
  ('KZ', 'Kazakistan', 'Kazakhstan', 'Казахстан', 100),
  ('LA', 'Laos', 'Laos', 'Лаос', 100),
  ('LB', 'Lübnan', 'Lebanon', 'Ливан', 100),
  ('LC', 'Saint Lucia', 'St. Lucia', 'Сент-Люсия', 100),
  ('LI', 'Liechtenstein', 'Liechtenstein', 'Лихтенштейн', 100),
  ('LK', 'Sri Lanka', 'Sri Lanka', 'Шри-Ланка', 100),
  ('LR', 'Liberya', 'Liberia', 'Либерия', 100),
  ('LS', 'Lesotho', 'Lesotho', 'Лесото', 100),
  ('LT', 'Litvanya', 'Lithuania', 'Литва', 100),
  ('LU', 'Lüksemburg', 'Luxembourg', 'Люксембург', 100),
  ('LV', 'Letonya', 'Latvia', 'Латвия', 100),
  ('LY', 'Libya', 'Libya', 'Ливия', 100),
  ('MA', 'Fas', 'Morocco', 'Марокко', 100),
  ('MC', 'Monako', 'Monaco', 'Монако', 100),
  ('MD', 'Moldova', 'Moldova', 'Молдова', 100),
  ('ME', 'Karadağ', 'Montenegro', 'Черногория', 100),
  ('MF', 'Saint Martin', 'St. Martin', 'Сен-Мартен', 100),
  ('MG', 'Madagaskar', 'Madagascar', 'Мадагаскар', 100),
  ('MH', 'Marshall Adaları', 'Marshall Islands', 'Маршалловы Острова', 100),
  ('MK', 'Kuzey Makedonya', 'North Macedonia', 'Северная Македония', 100),
  ('ML', 'Mali', 'Mali', 'Мали', 100),
  ('MM', 'Myanmar (Burma)', 'Myanmar (Burma)', 'Мьянма (Бирма)', 100),
  ('MN', 'Moğolistan', 'Mongolia', 'Монголия', 100),
  ('MO', 'Çin Makao ÖİB', 'Macao SAR China', 'Макао (САР)', 100),
  ('MP', 'Kuzey Mariana Adaları', 'Northern Mariana Islands', 'Северные Марианские о-ва', 100),
  ('MQ', 'Martinik', 'Martinique', 'Мартиника', 100),
  ('MR', 'Moritanya', 'Mauritania', 'Мавритания', 100),
  ('MS', 'Montserrat', 'Montserrat', 'Монтсеррат', 100),
  ('MT', 'Malta', 'Malta', 'Мальта', 100),
  ('MU', 'Mauritius', 'Mauritius', 'Маврикий', 100),
  ('MV', 'Maldivler', 'Maldives', 'Мальдивы', 100),
  ('MW', 'Malavi', 'Malawi', 'Малави', 100),
  ('MX', 'Meksika', 'Mexico', 'Мексика', 100),
  ('MY', 'Malezya', 'Malaysia', 'Малайзия', 100),
  ('MZ', 'Mozambik', 'Mozambique', 'Мозамбик', 100),
  ('NA', 'Namibya', 'Namibia', 'Намибия', 100),
  ('NC', 'Yeni Kaledonya', 'New Caledonia', 'Новая Каледония', 100),
  ('NE', 'Nijer', 'Niger', 'Нигер', 100),
  ('NF', 'Norfolk Adası', 'Norfolk Island', 'о-в Норфолк', 100),
  ('NG', 'Nijerya', 'Nigeria', 'Нигерия', 100),
  ('NI', 'Nikaragua', 'Nicaragua', 'Никарагуа', 100),
  ('NL', 'Hollanda', 'Netherlands', 'Нидерланды', 100),
  ('NO', 'Norveç', 'Norway', 'Норвегия', 100),
  ('NP', 'Nepal', 'Nepal', 'Непал', 100),
  ('NR', 'Nauru', 'Nauru', 'Науру', 100),
  ('NU', 'Niue', 'Niue', 'Ниуэ', 100),
  ('NZ', 'Yeni Zelanda', 'New Zealand', 'Новая Зеландия', 100),
  ('OM', 'Umman', 'Oman', 'Оман', 100),
  ('PA', 'Panama', 'Panama', 'Панама', 100),
  ('PE', 'Peru', 'Peru', 'Перу', 100),
  ('PF', 'Fransız Polinezyası', 'French Polynesia', 'Французская Полинезия', 100),
  ('PG', 'Papua Yeni Gine', 'Papua New Guinea', 'Папуа — Новая Гвинея', 100),
  ('PH', 'Filipinler', 'Philippines', 'Филиппины', 100),
  ('PK', 'Pakistan', 'Pakistan', 'Пакистан', 100),
  ('PL', 'Polonya', 'Poland', 'Польша', 100),
  ('PM', 'Saint Pierre ve Miquelon', 'St. Pierre & Miquelon', 'Сен-Пьер и Микелон', 100),
  ('PN', 'Pitcairn Adaları', 'Pitcairn Islands', 'о-ва Питкэрн', 100),
  ('PR', 'Porto Riko', 'Puerto Rico', 'Пуэрто-Рико', 100),
  ('PS', 'Filistin Bölgeleri', 'Palestinian Territories', 'Палестинские территории', 100),
  ('PT', 'Portekiz', 'Portugal', 'Португалия', 100),
  ('PW', 'Palau', 'Palau', 'Палау', 100),
  ('PY', 'Paraguay', 'Paraguay', 'Парагвай', 100),
  ('QA', 'Katar', 'Qatar', 'Катар', 100),
  ('RE', 'Reunion', 'Réunion', 'Реюньон', 100),
  ('RO', 'Romanya', 'Romania', 'Румыния', 100),
  ('RS', 'Sırbistan', 'Serbia', 'Сербия', 100),
  ('RU', 'Rusya', 'Russia', 'Россия', 100),
  ('RW', 'Ruanda', 'Rwanda', 'Руанда', 100),
  ('SA', 'Suudi Arabistan', 'Saudi Arabia', 'Саудовская Аравия', 100),
  ('SB', 'Solomon Adaları', 'Solomon Islands', 'Соломоновы Острова', 100),
  ('SC', 'Seyşeller', 'Seychelles', 'Сейшельские Острова', 100),
  ('SD', 'Sudan', 'Sudan', 'Судан', 100),
  ('SE', 'İsveç', 'Sweden', 'Швеция', 100),
  ('SG', 'Singapur', 'Singapore', 'Сингапур', 100),
  ('SH', 'Saint Helena', 'St. Helena', 'о-в Св. Елены', 100),
  ('SI', 'Slovenya', 'Slovenia', 'Словения', 100),
  ('SJ', 'Svalbard ve Jan Mayen', 'Svalbard & Jan Mayen', 'Шпицберген и Ян-Майен', 100),
  ('SK', 'Slovakya', 'Slovakia', 'Словакия', 100),
  ('SL', 'Sierra Leone', 'Sierra Leone', 'Сьерра-Леоне', 100),
  ('SM', 'San Marino', 'San Marino', 'Сан-Марино', 100),
  ('SN', 'Senegal', 'Senegal', 'Сенегал', 100),
  ('SO', 'Somali', 'Somalia', 'Сомали', 100),
  ('SR', 'Surinam', 'Suriname', 'Суринам', 100),
  ('SS', 'Güney Sudan', 'South Sudan', 'Южный Судан', 100),
  ('ST', 'Sao Tome ve Principe', 'São Tomé & Príncipe', 'Сан-Томе и Принсипи', 100),
  ('SV', 'El Salvador', 'El Salvador', 'Сальвадор', 100),
  ('SX', 'Sint Maarten', 'Sint Maarten', 'Синт-Мартен', 100),
  ('SY', 'Suriye', 'Syria', 'Сирия', 100),
  ('SZ', 'Esvatini', 'Eswatini', 'Эсватини', 100),
  ('TC', 'Turks ve Caicos Adaları', 'Turks & Caicos Islands', 'о-ва Тёркс и Кайкос', 100),
  ('TD', 'Çad', 'Chad', 'Чад', 100),
  ('TF', 'Fransız Güney Toprakları', 'French Southern Territories', 'Французские Южные территории', 100),
  ('TG', 'Togo', 'Togo', 'Того', 100),
  ('TH', 'Tayland', 'Thailand', 'Таиланд', 100),
  ('TJ', 'Tacikistan', 'Tajikistan', 'Таджикистан', 100),
  ('TK', 'Tokelau', 'Tokelau', 'Токелау', 100),
  ('TL', 'Timor-Leste', 'Timor-Leste', 'Восточный Тимор', 100),
  ('TM', 'Türkmenistan', 'Turkmenistan', 'Туркменистан', 100),
  ('TN', 'Tunus', 'Tunisia', 'Тунис', 100),
  ('TO', 'Tonga', 'Tonga', 'Тонга', 100),
  ('TR', 'Türkiye', 'Turkey', 'Турция', 1),
  ('TT', 'Trinidad ve Tobago', 'Trinidad & Tobago', 'Тринидад и Тобаго', 100),
  ('TV', 'Tuvalu', 'Tuvalu', 'Тувалу', 100),
  ('TW', 'Tayvan', 'Taiwan', 'Тайвань', 100),
  ('TZ', 'Tanzanya', 'Tanzania', 'Танзания', 100),
  ('UA', 'Ukrayna', 'Ukraine', 'Украина', 100),
  ('UG', 'Uganda', 'Uganda', 'Уганда', 100),
  ('UM', 'ABD Küçük Harici Adaları', 'U.S. Outlying Islands', 'Внешние малые о-ва (США)', 100),
  ('US', 'Amerika Birleşik Devletleri', 'United States', 'Соединенные Штаты', 100),
  ('UY', 'Uruguay', 'Uruguay', 'Уругвай', 100),
  ('UZ', 'Özbekistan', 'Uzbekistan', 'Узбекистан', 100),
  ('VA', 'Vatikan', 'Vatican City', 'Ватикан', 100),
  ('VC', 'Saint Vincent ve Grenadinler', 'St. Vincent & Grenadines', 'Сент-Винсент и Гренадины', 100),
  ('VE', 'Venezuela', 'Venezuela', 'Венесуэла', 100),
  ('VG', 'Britanya Virjin Adaları', 'British Virgin Islands', 'Виргинские о-ва (Великобритания)', 100),
  ('VI', 'ABD Virjin Adaları', 'U.S. Virgin Islands', 'Виргинские о-ва (США)', 100),
  ('VN', 'Vietnam', 'Vietnam', 'Вьетнам', 100),
  ('VU', 'Vanuatu', 'Vanuatu', 'Вануату', 100),
  ('WF', 'Wallis ve Futuna', 'Wallis & Futuna', 'Уоллис и Футуна', 100),
  ('WS', 'Samoa', 'Samoa', 'Самоа', 100),
  ('YE', 'Yemen', 'Yemen', 'Йемен', 100),
  ('YT', 'Mayotte', 'Mayotte', 'Майотта', 100),
  ('ZA', 'Güney Afrika', 'South Africa', 'Южно-Африканская Республика', 100),
  ('ZM', 'Zambiya', 'Zambia', 'Замбия', 100),
  ('ZW', 'Zimbabve', 'Zimbabwe', 'Зимбабве', 100)
on conflict (code) do update set
  name_tr = excluded.name_tr,
  name_en = excluded.name_en,
  name_ru = excluded.name_ru,
  sort_order = excluded.sort_order;

-- ---------- İller ----------
insert into regions (country_code, parent_id, level, code, name) values
  ('TR', null, 1, '01', 'Adana'),
  ('TR', null, 1, '02', 'Adıyaman'),
  ('TR', null, 1, '03', 'Afyonkarahisar'),
  ('TR', null, 1, '04', 'Ağrı'),
  ('TR', null, 1, '05', 'Amasya'),
  ('TR', null, 1, '06', 'Ankara'),
  ('TR', null, 1, '07', 'Antalya'),
  ('TR', null, 1, '08', 'Artvin'),
  ('TR', null, 1, '09', 'Aydın'),
  ('TR', null, 1, '10', 'Balıkesir'),
  ('TR', null, 1, '11', 'Bilecik'),
  ('TR', null, 1, '12', 'Bingöl'),
  ('TR', null, 1, '13', 'Bitlis'),
  ('TR', null, 1, '14', 'Bolu'),
  ('TR', null, 1, '15', 'Burdur'),
  ('TR', null, 1, '16', 'Bursa'),
  ('TR', null, 1, '17', 'Çanakkale'),
  ('TR', null, 1, '18', 'Çankırı'),
  ('TR', null, 1, '19', 'Çorum'),
  ('TR', null, 1, '20', 'Denizli'),
  ('TR', null, 1, '21', 'Diyarbakır'),
  ('TR', null, 1, '22', 'Edirne'),
  ('TR', null, 1, '23', 'Elazığ'),
  ('TR', null, 1, '24', 'Erzincan'),
  ('TR', null, 1, '25', 'Erzurum'),
  ('TR', null, 1, '26', 'Eskişehir'),
  ('TR', null, 1, '27', 'Gaziantep'),
  ('TR', null, 1, '28', 'Giresun'),
  ('TR', null, 1, '29', 'Gümüşhane'),
  ('TR', null, 1, '30', 'Hakkari'),
  ('TR', null, 1, '31', 'Hatay'),
  ('TR', null, 1, '32', 'Isparta'),
  ('TR', null, 1, '33', 'Mersin'),
  ('TR', null, 1, '34', 'İstanbul'),
  ('TR', null, 1, '35', 'İzmir'),
  ('TR', null, 1, '36', 'Kars'),
  ('TR', null, 1, '37', 'Kastamonu'),
  ('TR', null, 1, '38', 'Kayseri'),
  ('TR', null, 1, '39', 'Kırklareli'),
  ('TR', null, 1, '40', 'Kırşehir'),
  ('TR', null, 1, '41', 'Kocaeli'),
  ('TR', null, 1, '42', 'Konya'),
  ('TR', null, 1, '43', 'Kütahya'),
  ('TR', null, 1, '44', 'Malatya'),
  ('TR', null, 1, '45', 'Manisa'),
  ('TR', null, 1, '46', 'Kahramanmaraş'),
  ('TR', null, 1, '47', 'Mardin'),
  ('TR', null, 1, '48', 'Muğla'),
  ('TR', null, 1, '49', 'Muş'),
  ('TR', null, 1, '50', 'Nevşehir'),
  ('TR', null, 1, '51', 'Niğde'),
  ('TR', null, 1, '52', 'Ordu'),
  ('TR', null, 1, '53', 'Rize'),
  ('TR', null, 1, '54', 'Sakarya'),
  ('TR', null, 1, '55', 'Samsun'),
  ('TR', null, 1, '56', 'Siirt'),
  ('TR', null, 1, '57', 'Sinop'),
  ('TR', null, 1, '58', 'Sivas'),
  ('TR', null, 1, '59', 'Tekirdağ'),
  ('TR', null, 1, '60', 'Tokat'),
  ('TR', null, 1, '61', 'Trabzon'),
  ('TR', null, 1, '62', 'Tunceli'),
  ('TR', null, 1, '63', 'Şanlıurfa'),
  ('TR', null, 1, '64', 'Uşak'),
  ('TR', null, 1, '65', 'Van'),
  ('TR', null, 1, '66', 'Yozgat'),
  ('TR', null, 1, '67', 'Zonguldak'),
  ('TR', null, 1, '68', 'Aksaray'),
  ('TR', null, 1, '69', 'Bayburt'),
  ('TR', null, 1, '70', 'Karaman'),
  ('TR', null, 1, '71', 'Kırıkkale'),
  ('TR', null, 1, '72', 'Batman'),
  ('TR', null, 1, '73', 'Şırnak'),
  ('TR', null, 1, '74', 'Bartın'),
  ('TR', null, 1, '75', 'Ardahan'),
  ('TR', null, 1, '76', 'Iğdır'),
  ('TR', null, 1, '77', 'Yalova'),
  ('TR', null, 1, '78', 'Karabük'),
  ('TR', null, 1, '79', 'Kilis'),
  ('TR', null, 1, '80', 'Osmaniye'),
  ('TR', null, 1, '81', 'Düzce')
on conflict (country_code, level, parent_id, name) do nothing;

-- ---------- İlçeler ----------
-- İl kimlikleri üretimde farklı olacağı için plaka koduyla eşleştirilir.
insert into regions (country_code, parent_id, level, name)
select 'TR', p.id, 2, d.name
from (values
  ('01', 'Aladağ'),
  ('01', 'Ceyhan'),
  ('01', 'Feke'),
  ('01', 'Karaisalı'),
  ('01', 'Karataş'),
  ('01', 'Kozan'),
  ('01', 'Pozantı'),
  ('01', 'Saimbeyli'),
  ('01', 'Sarıçam'),
  ('01', 'Seyhan'),
  ('01', 'Tufanbeyli'),
  ('01', 'Yumurtalık'),
  ('01', 'Yüreğir'),
  ('01', 'Çukurova'),
  ('01', 'İmamoğlu'),
  ('02', 'Besni'),
  ('02', 'Gerger'),
  ('02', 'Gölbaşı'),
  ('02', 'Kahta'),
  ('02', 'Merkez'),
  ('02', 'Samsat'),
  ('02', 'Sincik'),
  ('02', 'Tut'),
  ('02', 'Çelikhan'),
  ('03', 'Bayat'),
  ('03', 'Başmakçı'),
  ('03', 'Bolvadin'),
  ('03', 'Dazkırı'),
  ('03', 'Dinar'),
  ('03', 'Emirdağ'),
  ('03', 'Evciler'),
  ('03', 'Hocalar'),
  ('03', 'Kızılören'),
  ('03', 'Merkez'),
  ('03', 'Sandıklı'),
  ('03', 'Sinanpaşa'),
  ('03', 'Sultandağı'),
  ('03', 'Çay'),
  ('03', 'Çobanlar'),
  ('03', 'İhsaniye'),
  ('03', 'İscehisar'),
  ('03', 'Şuhut'),
  ('04', 'Diyadin'),
  ('04', 'Doğubayazıt'),
  ('04', 'Eleşkirt'),
  ('04', 'Hamur'),
  ('04', 'Merkez'),
  ('04', 'Patnos'),
  ('04', 'Taşlıçay'),
  ('04', 'Tutak'),
  ('05', 'Göynücek'),
  ('05', 'Gümüşhacıköy'),
  ('05', 'Hamamözü'),
  ('05', 'Merkez'),
  ('05', 'Merzifon'),
  ('05', 'Suluova'),
  ('05', 'Taşova'),
  ('06', 'Akyurt'),
  ('06', 'Altındağ'),
  ('06', 'Ayaş'),
  ('06', 'Bala'),
  ('06', 'Beypazarı'),
  ('06', 'Elmadağ'),
  ('06', 'Etimesgut'),
  ('06', 'Evren'),
  ('06', 'Gölbaşı'),
  ('06', 'Güdül'),
  ('06', 'Haymana'),
  ('06', 'Kahramankazan'),
  ('06', 'Kalecik'),
  ('06', 'Keçiören'),
  ('06', 'Kızılcahamam'),
  ('06', 'Mamak'),
  ('06', 'Nallıhan'),
  ('06', 'Polatlı'),
  ('06', 'Pursaklar'),
  ('06', 'Sincan'),
  ('06', 'Yenimahalle'),
  ('06', 'Çamlıdere'),
  ('06', 'Çankaya'),
  ('06', 'Çubuk'),
  ('06', 'Şereflikoçhisar'),
  ('07', 'Akseki'),
  ('07', 'Aksu'),
  ('07', 'Alanya'),
  ('07', 'Demre'),
  ('07', 'Döşemealtı'),
  ('07', 'Elmalı'),
  ('07', 'Finike'),
  ('07', 'Gazipaşa'),
  ('07', 'Gündoğmuş'),
  ('07', 'Kaş'),
  ('07', 'Kemer'),
  ('07', 'Kepez'),
  ('07', 'Konyaaltı'),
  ('07', 'Korkuteli'),
  ('07', 'Kumluca'),
  ('07', 'Manavgat'),
  ('07', 'Muratpaşa'),
  ('07', 'Serik'),
  ('07', 'İbradı'),
  ('08', 'Ardanuç'),
  ('08', 'Arhavi'),
  ('08', 'Borçka'),
  ('08', 'Hopa'),
  ('08', 'Kemalpaşa'),
  ('08', 'Merkez'),
  ('08', 'Murgul'),
  ('08', 'Yusufeli'),
  ('08', 'Şavşat'),
  ('09', 'Bozdoğan'),
  ('09', 'Buharkent'),
  ('09', 'Didim'),
  ('09', 'Efeler'),
  ('09', 'Germencik'),
  ('09', 'Karacasu'),
  ('09', 'Karpuzlu'),
  ('09', 'Koçarlı'),
  ('09', 'Kuyucak'),
  ('09', 'Kuşadası'),
  ('09', 'Köşk'),
  ('09', 'Nazilli'),
  ('09', 'Sultanhisar'),
  ('09', 'Söke'),
  ('09', 'Yenipazar'),
  ('09', 'Çine'),
  ('09', 'İncirliova'),
  ('10', 'Altıeylül'),
  ('10', 'Ayvalık'),
  ('10', 'Balya'),
  ('10', 'Bandırma'),
  ('10', 'Bigadiç'),
  ('10', 'Burhaniye'),
  ('10', 'Dursunbey'),
  ('10', 'Edremit'),
  ('10', 'Erdek'),
  ('10', 'Gömeç'),
  ('10', 'Gönen'),
  ('10', 'Havran'),
  ('10', 'Karesi'),
  ('10', 'Kepsut'),
  ('10', 'Manyas'),
  ('10', 'Marmara'),
  ('10', 'Savaştepe'),
  ('10', 'Susurluk'),
  ('10', 'Sındırgı'),
  ('10', 'İvrindi'),
  ('11', 'Bozüyük'),
  ('11', 'Gölpazarı'),
  ('11', 'Merkez'),
  ('11', 'Osmaneli'),
  ('11', 'Pazaryeri'),
  ('11', 'Söğüt'),
  ('11', 'Yenipazar'),
  ('11', 'İnhisar'),
  ('12', 'Adaklı'),
  ('12', 'Genç'),
  ('12', 'Karlıova'),
  ('12', 'Kiğı'),
  ('12', 'Merkez'),
  ('12', 'Solhan'),
  ('12', 'Yayladere'),
  ('12', 'Yedisu'),
  ('13', 'Adilcevaz'),
  ('13', 'Ahlat'),
  ('13', 'Güroymak'),
  ('13', 'Hizan'),
  ('13', 'Merkez'),
  ('13', 'Mutki'),
  ('13', 'Tatvan'),
  ('14', 'Dörtdivan'),
  ('14', 'Gerede'),
  ('14', 'Göynük'),
  ('14', 'Kıbrıscık'),
  ('14', 'Mengen'),
  ('14', 'Merkez'),
  ('14', 'Mudurnu'),
  ('14', 'Seben'),
  ('14', 'Yeniçağa'),
  ('15', 'Altınyayla'),
  ('15', 'Ağlasun'),
  ('15', 'Bucak'),
  ('15', 'Gölhisar'),
  ('15', 'Karamanlı'),
  ('15', 'Kemer'),
  ('15', 'Merkez'),
  ('15', 'Tefenni'),
  ('15', 'Yeşilova'),
  ('15', 'Çavdır'),
  ('15', 'Çeltikçi'),
  ('16', 'Büyükorhan'),
  ('16', 'Gemlik'),
  ('16', 'Gürsu'),
  ('16', 'Harmancık'),
  ('16', 'Karacabey'),
  ('16', 'Keles'),
  ('16', 'Kestel'),
  ('16', 'Mudanya'),
  ('16', 'Mustafakemalpaşa'),
  ('16', 'Nilüfer'),
  ('16', 'Orhaneli'),
  ('16', 'Orhangazi'),
  ('16', 'Osmangazi'),
  ('16', 'Yenişehir'),
  ('16', 'Yıldırım'),
  ('16', 'İnegöl'),
  ('16', 'İznik'),
  ('17', 'Ayvacık'),
  ('17', 'Bayramiç'),
  ('17', 'Biga'),
  ('17', 'Bozcaada'),
  ('17', 'Eceabat'),
  ('17', 'Ezine'),
  ('17', 'Gelibolu'),
  ('17', 'Gökçeada'),
  ('17', 'Lapseki'),
  ('17', 'Merkez'),
  ('17', 'Yenice'),
  ('17', 'Çan'),
  ('18', 'Atkaracalar'),
  ('18', 'Bayramören'),
  ('18', 'Eldivan'),
  ('18', 'Ilgaz'),
  ('18', 'Korgun'),
  ('18', 'Kurşunlu'),
  ('18', 'Kızılırmak'),
  ('18', 'Merkez'),
  ('18', 'Orta'),
  ('18', 'Yapraklı'),
  ('18', 'Çerkeş'),
  ('18', 'Şabanözü'),
  ('19', 'Alaca'),
  ('19', 'Bayat'),
  ('19', 'Boğazkale'),
  ('19', 'Dodurga'),
  ('19', 'Kargı'),
  ('19', 'Laçin'),
  ('19', 'Mecitözü'),
  ('19', 'Merkez'),
  ('19', 'Ortaköy'),
  ('19', 'Osmancık'),
  ('19', 'Oğuzlar'),
  ('19', 'Sungurlu'),
  ('19', 'Uğurludağ'),
  ('19', 'İskilip'),
  ('20', 'Acıpayam'),
  ('20', 'Babadağ'),
  ('20', 'Baklan'),
  ('20', 'Bekilli'),
  ('20', 'Beyağaç'),
  ('20', 'Bozkurt'),
  ('20', 'Buldan'),
  ('20', 'Güney'),
  ('20', 'Honaz'),
  ('20', 'Kale'),
  ('20', 'Merkezefendi'),
  ('20', 'Pamukkale'),
  ('20', 'Sarayköy'),
  ('20', 'Serinhisar'),
  ('20', 'Tavas'),
  ('20', 'Çal'),
  ('20', 'Çameli'),
  ('20', 'Çardak'),
  ('20', 'Çivril'),
  ('21', 'Bağlar'),
  ('21', 'Bismil'),
  ('21', 'Dicle'),
  ('21', 'Ergani'),
  ('21', 'Eğil'),
  ('21', 'Hani'),
  ('21', 'Hazro'),
  ('21', 'Kayapınar'),
  ('21', 'Kocaköy'),
  ('21', 'Kulp'),
  ('21', 'Lice'),
  ('21', 'Silvan'),
  ('21', 'Sur'),
  ('21', 'Yenişehir'),
  ('21', 'Çermik'),
  ('21', 'Çüngüş'),
  ('21', 'Çınar'),
  ('22', 'Enez'),
  ('22', 'Havsa'),
  ('22', 'Keşan'),
  ('22', 'Lalapaşa'),
  ('22', 'Meriç'),
  ('22', 'Merkez'),
  ('22', 'Süloğlu'),
  ('22', 'Uzunköprü'),
  ('22', 'İpsala'),
  ('23', 'Alacakaya'),
  ('23', 'Arıcak'),
  ('23', 'Ağın'),
  ('23', 'Baskil'),
  ('23', 'Karakoçan'),
  ('23', 'Keban'),
  ('23', 'Kovancılar'),
  ('23', 'Maden'),
  ('23', 'Merkez'),
  ('23', 'Palu'),
  ('23', 'Sivrice'),
  ('24', 'Kemah'),
  ('24', 'Kemaliye'),
  ('24', 'Merkez'),
  ('24', 'Otlukbeli'),
  ('24', 'Refahiye'),
  ('24', 'Tercan'),
  ('24', 'Çayırlı'),
  ('24', 'Üzümlü'),
  ('24', 'İliç'),
  ('25', 'Aziziye'),
  ('25', 'Aşkale'),
  ('25', 'Horasan'),
  ('25', 'Hınıs'),
  ('25', 'Karayazı'),
  ('25', 'Karaçoban'),
  ('25', 'Köprüköy'),
  ('25', 'Narman'),
  ('25', 'Oltu'),
  ('25', 'Olur'),
  ('25', 'Palandöken'),
  ('25', 'Pasinler'),
  ('25', 'Pazaryolu'),
  ('25', 'Tekman'),
  ('25', 'Tortum'),
  ('25', 'Uzundere'),
  ('25', 'Yakutiye'),
  ('25', 'Çat'),
  ('25', 'İspir'),
  ('25', 'Şenkaya'),
  ('26', 'Alpu'),
  ('26', 'Beylikova'),
  ('26', 'Günyüzü'),
  ('26', 'Han'),
  ('26', 'Mahmudiye'),
  ('26', 'Mihalgazi'),
  ('26', 'Mihalıççık'),
  ('26', 'Odunpazarı'),
  ('26', 'Sarıcakaya'),
  ('26', 'Seyitgazi'),
  ('26', 'Sivrihisar'),
  ('26', 'Tepebaşı'),
  ('26', 'Çifteler'),
  ('26', 'İnönü'),
  ('27', 'Araban'),
  ('27', 'Karkamış'),
  ('27', 'Nizip'),
  ('27', 'Nurdağı'),
  ('27', 'Oğuzeli'),
  ('27', 'Yavuzeli'),
  ('27', 'İslahiye'),
  ('27', 'Şahinbey'),
  ('27', 'Şehitkamil'),
  ('28', 'Alucra'),
  ('28', 'Bulancak'),
  ('28', 'Dereli'),
  ('28', 'Doğankent'),
  ('28', 'Espiye'),
  ('28', 'Eynesil'),
  ('28', 'Görele'),
  ('28', 'Güce'),
  ('28', 'Keşap'),
  ('28', 'Merkez'),
  ('28', 'Piraziz'),
  ('28', 'Tirebolu'),
  ('28', 'Yağlıdere'),
  ('28', 'Çamoluk'),
  ('28', 'Çanakçı'),
  ('28', 'Şebinkarahisar'),
  ('29', 'Kelkit'),
  ('29', 'Köse'),
  ('29', 'Kürtün'),
  ('29', 'Merkez'),
  ('29', 'Torul'),
  ('29', 'Şiran'),
  ('30', 'Derecik'),
  ('30', 'Merkez'),
  ('30', 'Yüksekova'),
  ('30', 'Çukurca'),
  ('30', 'Şemdinli'),
  ('31', 'Altınözü'),
  ('31', 'Antakya'),
  ('31', 'Arsuz'),
  ('31', 'Belen'),
  ('31', 'Defne'),
  ('31', 'Dörtyol'),
  ('31', 'Erzin'),
  ('31', 'Hassa'),
  ('31', 'Kumlu'),
  ('31', 'Kırıkhan'),
  ('31', 'Payas'),
  ('31', 'Reyhanlı'),
  ('31', 'Samandağ'),
  ('31', 'Yayladağı'),
  ('31', 'İskenderun'),
  ('32', 'Aksu'),
  ('32', 'Atabey'),
  ('32', 'Eğirdir'),
  ('32', 'Gelendost'),
  ('32', 'Gönen'),
  ('32', 'Keçiborlu'),
  ('32', 'Merkez'),
  ('32', 'Senirkent'),
  ('32', 'Sütçüler'),
  ('32', 'Uluborlu'),
  ('32', 'Yalvaç'),
  ('32', 'Yenişarbademli'),
  ('32', 'Şarkikaraağaç'),
  ('33', 'Akdeniz'),
  ('33', 'Anamur'),
  ('33', 'Aydıncık'),
  ('33', 'Bozyazı'),
  ('33', 'Erdemli'),
  ('33', 'Gülnar'),
  ('33', 'Mezitli'),
  ('33', 'Mut'),
  ('33', 'Silifke'),
  ('33', 'Tarsus'),
  ('33', 'Toroslar'),
  ('33', 'Yenişehir'),
  ('33', 'Çamlıyayla'),
  ('34', 'Adalar'),
  ('34', 'Arnavutköy'),
  ('34', 'Ataşehir'),
  ('34', 'Avcılar'),
  ('34', 'Bahçelievler'),
  ('34', 'Bakırköy'),
  ('34', 'Bayrampaşa'),
  ('34', 'Bağcılar'),
  ('34', 'Başakşehir'),
  ('34', 'Beykoz'),
  ('34', 'Beylikdüzü'),
  ('34', 'Beyoğlu'),
  ('34', 'Beşiktaş'),
  ('34', 'Büyükçekmece'),
  ('34', 'Esenler'),
  ('34', 'Esenyurt'),
  ('34', 'Eyüpsultan'),
  ('34', 'Fatih'),
  ('34', 'Gaziosmanpaşa'),
  ('34', 'Güngören'),
  ('34', 'Kadıköy'),
  ('34', 'Kartal'),
  ('34', 'Kağıthane'),
  ('34', 'Küçükçekmece'),
  ('34', 'Maltepe'),
  ('34', 'Pendik'),
  ('34', 'Sancaktepe'),
  ('34', 'Sarıyer'),
  ('34', 'Silivri'),
  ('34', 'Sultanbeyli'),
  ('34', 'Sultangazi'),
  ('34', 'Tuzla'),
  ('34', 'Zeytinburnu'),
  ('34', 'Çatalca'),
  ('34', 'Çekmeköy'),
  ('34', 'Ümraniye'),
  ('34', 'Üsküdar'),
  ('34', 'Şile'),
  ('34', 'Şişli'),
  ('35', 'Aliağa'),
  ('35', 'Balçova'),
  ('35', 'Bayraklı'),
  ('35', 'Bayındır'),
  ('35', 'Bergama'),
  ('35', 'Beydağ'),
  ('35', 'Bornova'),
  ('35', 'Buca'),
  ('35', 'Dikili'),
  ('35', 'Foça'),
  ('35', 'Gaziemir'),
  ('35', 'Güzelbahçe'),
  ('35', 'Karabağlar'),
  ('35', 'Karaburun'),
  ('35', 'Karşıyaka'),
  ('35', 'Kemalpaşa'),
  ('35', 'Kiraz'),
  ('35', 'Konak'),
  ('35', 'Kınık'),
  ('35', 'Menderes'),
  ('35', 'Menemen'),
  ('35', 'Narlıdere'),
  ('35', 'Seferihisar'),
  ('35', 'Selçuk'),
  ('35', 'Tire'),
  ('35', 'Torbalı'),
  ('35', 'Urla'),
  ('35', 'Çeşme'),
  ('35', 'Çiğli'),
  ('35', 'Ödemiş'),
  ('36', 'Akyaka'),
  ('36', 'Arpaçay'),
  ('36', 'Digor'),
  ('36', 'Kağızman'),
  ('36', 'Merkez'),
  ('36', 'Sarıkamış'),
  ('36', 'Selim'),
  ('36', 'Susuz'),
  ('37', 'Abana'),
  ('37', 'Araç'),
  ('37', 'Azdavay'),
  ('37', 'Ağlı'),
  ('37', 'Bozkurt'),
  ('37', 'Cide'),
  ('37', 'Daday'),
  ('37', 'Devrekani'),
  ('37', 'Doğanyurt'),
  ('37', 'Hanönü'),
  ('37', 'Küre'),
  ('37', 'Merkez'),
  ('37', 'Pınarbaşı'),
  ('37', 'Seydiler'),
  ('37', 'Taşköprü'),
  ('37', 'Tosya'),
  ('37', 'Çatalzeytin'),
  ('37', 'İhsangazi'),
  ('37', 'İnebolu'),
  ('37', 'Şenpazar'),
  ('38', 'Akkışla'),
  ('38', 'Bünyan'),
  ('38', 'Develi'),
  ('38', 'Felahiye'),
  ('38', 'Hacılar'),
  ('38', 'Kocasinan'),
  ('38', 'Melikgazi'),
  ('38', 'Pınarbaşı'),
  ('38', 'Sarıoğlan'),
  ('38', 'Sarız'),
  ('38', 'Talas'),
  ('38', 'Tomarza'),
  ('38', 'Yahyalı'),
  ('38', 'Yeşilhisar'),
  ('38', 'Özvatan'),
  ('38', 'İncesu'),
  ('39', 'Babaeski'),
  ('39', 'Demirköy'),
  ('39', 'Kofçaz'),
  ('39', 'Lüleburgaz'),
  ('39', 'Merkez'),
  ('39', 'Pehlivanköy'),
  ('39', 'Pınarhisar'),
  ('39', 'Vize'),
  ('40', 'Akpınar'),
  ('40', 'Akçakent'),
  ('40', 'Boztepe'),
  ('40', 'Kaman'),
  ('40', 'Merkez'),
  ('40', 'Mucur'),
  ('40', 'Çiçekdağı'),
  ('41', 'Başiskele'),
  ('41', 'Darıca'),
  ('41', 'Derince'),
  ('41', 'Dilovası'),
  ('41', 'Gebze'),
  ('41', 'Gölcük'),
  ('41', 'Kandıra'),
  ('41', 'Karamürsel'),
  ('41', 'Kartepe'),
  ('41', 'Körfez'),
  ('41', 'Çayırova'),
  ('41', 'İzmit'),
  ('42', 'Ahırlı'),
  ('42', 'Akören'),
  ('42', 'Akşehir'),
  ('42', 'Altınekin'),
  ('42', 'Beyşehir'),
  ('42', 'Bozkır'),
  ('42', 'Cihanbeyli'),
  ('42', 'Derbent'),
  ('42', 'Derebucak'),
  ('42', 'Doğanhisar'),
  ('42', 'Emirgazi'),
  ('42', 'Ereğli'),
  ('42', 'Güneysınır'),
  ('42', 'Hadim'),
  ('42', 'Halkapınar'),
  ('42', 'Hüyük'),
  ('42', 'Ilgın'),
  ('42', 'Kadınhanı'),
  ('42', 'Karapınar'),
  ('42', 'Karatay'),
  ('42', 'Kulu'),
  ('42', 'Meram'),
  ('42', 'Sarayönü'),
  ('42', 'Selçuklu'),
  ('42', 'Seydişehir'),
  ('42', 'Taşkent'),
  ('42', 'Tuzlukçu'),
  ('42', 'Yalıhüyük'),
  ('42', 'Yunak'),
  ('42', 'Çeltik'),
  ('42', 'Çumra'),
  ('43', 'Altıntaş'),
  ('43', 'Aslanapa'),
  ('43', 'Domaniç'),
  ('43', 'Dumlupınar'),
  ('43', 'Emet'),
  ('43', 'Gediz'),
  ('43', 'Hisarcık'),
  ('43', 'Merkez'),
  ('43', 'Pazarlar'),
  ('43', 'Simav'),
  ('43', 'Tavşanlı'),
  ('43', 'Çavdarhisar'),
  ('43', 'Şaphane'),
  ('44', 'Akçadağ'),
  ('44', 'Arapgir'),
  ('44', 'Arguvan'),
  ('44', 'Battalgazi'),
  ('44', 'Darende'),
  ('44', 'Doğanyol'),
  ('44', 'Doğanşehir'),
  ('44', 'Hekimhan'),
  ('44', 'Kale'),
  ('44', 'Kuluncak'),
  ('44', 'Pütürge'),
  ('44', 'Yazıhan'),
  ('44', 'Yeşilyurt'),
  ('45', 'Ahmetli'),
  ('45', 'Akhisar'),
  ('45', 'Alaşehir'),
  ('45', 'Demirci'),
  ('45', 'Gölmarmara'),
  ('45', 'Gördes'),
  ('45', 'Kula'),
  ('45', 'Köprübaşı'),
  ('45', 'Kırkağaç'),
  ('45', 'Salihli'),
  ('45', 'Saruhanlı'),
  ('45', 'Sarıgöl'),
  ('45', 'Selendi'),
  ('45', 'Soma'),
  ('45', 'Turgutlu'),
  ('45', 'Yunusemre'),
  ('45', 'Şehzadeler'),
  ('46', 'Afşin'),
  ('46', 'Andırın'),
  ('46', 'Dulkadiroğlu'),
  ('46', 'Ekinözü'),
  ('46', 'Elbistan'),
  ('46', 'Göksun'),
  ('46', 'Nurhak'),
  ('46', 'Onikişubat'),
  ('46', 'Pazarcık'),
  ('46', 'Türkoğlu'),
  ('46', 'Çağlayancerit'),
  ('47', 'Artuklu'),
  ('47', 'Dargeçit'),
  ('47', 'Derik'),
  ('47', 'Kızıltepe'),
  ('47', 'Mazıdağı'),
  ('47', 'Midyat'),
  ('47', 'Nusaybin'),
  ('47', 'Savur'),
  ('47', 'Yeşilli'),
  ('47', 'Ömerli'),
  ('48', 'Bodrum'),
  ('48', 'Dalaman'),
  ('48', 'Datça'),
  ('48', 'Fethiye'),
  ('48', 'Kavaklıdere'),
  ('48', 'Köyceğiz'),
  ('48', 'Marmaris'),
  ('48', 'Menteşe'),
  ('48', 'Milas'),
  ('48', 'Ortaca'),
  ('48', 'Seydikemer'),
  ('48', 'Ula'),
  ('48', 'Yatağan'),
  ('49', 'Bulanık'),
  ('49', 'Hasköy'),
  ('49', 'Korkut'),
  ('49', 'Malazgirt'),
  ('49', 'Merkez'),
  ('49', 'Varto'),
  ('50', 'Acıgöl'),
  ('50', 'Avanos'),
  ('50', 'Derinkuyu'),
  ('50', 'Gülşehir'),
  ('50', 'Hacıbektaş'),
  ('50', 'Kozaklı'),
  ('50', 'Merkez'),
  ('50', 'Ürgüp'),
  ('51', 'Altunhisar'),
  ('51', 'Bor'),
  ('51', 'Merkez'),
  ('51', 'Ulukışla'),
  ('51', 'Çamardı'),
  ('51', 'Çiftlik'),
  ('52', 'Akkuş'),
  ('52', 'Altınordu'),
  ('52', 'Aybastı'),
  ('52', 'Fatsa'),
  ('52', 'Gölköy'),
  ('52', 'Gülyalı'),
  ('52', 'Gürgentepe'),
  ('52', 'Kabadüz'),
  ('52', 'Kabataş'),
  ('52', 'Korgan'),
  ('52', 'Kumru'),
  ('52', 'Mesudiye'),
  ('52', 'Perşembe'),
  ('52', 'Ulubey'),
  ('52', 'Çamaş'),
  ('52', 'Çatalpınar'),
  ('52', 'Çaybaşı'),
  ('52', 'Ünye'),
  ('52', 'İkizce'),
  ('53', 'Ardeşen'),
  ('53', 'Derepazarı'),
  ('53', 'Fındıklı'),
  ('53', 'Güneysu'),
  ('53', 'Hemşin'),
  ('53', 'Kalkandere'),
  ('53', 'Merkez'),
  ('53', 'Pazar'),
  ('53', 'Çamlıhemşin'),
  ('53', 'Çayeli'),
  ('53', 'İkizdere'),
  ('53', 'İyidere'),
  ('54', 'Adapazarı'),
  ('54', 'Akyazı'),
  ('54', 'Arifiye'),
  ('54', 'Erenler'),
  ('54', 'Ferizli'),
  ('54', 'Geyve'),
  ('54', 'Hendek'),
  ('54', 'Karapürçek'),
  ('54', 'Karasu'),
  ('54', 'Kaynarca'),
  ('54', 'Kocaali'),
  ('54', 'Pamukova'),
  ('54', 'Sapanca'),
  ('54', 'Serdivan'),
  ('54', 'Söğütlü'),
  ('54', 'Taraklı'),
  ('55', '19 Mayıs'),
  ('55', 'Alaçam'),
  ('55', 'Asarcık'),
  ('55', 'Atakum'),
  ('55', 'Ayvacık'),
  ('55', 'Bafra'),
  ('55', 'Canik'),
  ('55', 'Havza'),
  ('55', 'Kavak'),
  ('55', 'Ladik'),
  ('55', 'Salıpazarı'),
  ('55', 'Tekkeköy'),
  ('55', 'Terme'),
  ('55', 'Vezirköprü'),
  ('55', 'Yakakent'),
  ('55', 'Çarşamba'),
  ('55', 'İlkadım'),
  ('56', 'Baykan'),
  ('56', 'Eruh'),
  ('56', 'Kurtalan'),
  ('56', 'Merkez'),
  ('56', 'Pervari'),
  ('56', 'Tillo'),
  ('56', 'Şirvan'),
  ('57', 'Ayancık'),
  ('57', 'Boyabat'),
  ('57', 'Dikmen'),
  ('57', 'Durağan'),
  ('57', 'Erfelek'),
  ('57', 'Gerze'),
  ('57', 'Merkez'),
  ('57', 'Saraydüzü'),
  ('57', 'Türkeli'),
  ('58', 'Akıncılar'),
  ('58', 'Altınyayla'),
  ('58', 'Divriği'),
  ('58', 'Doğanşar'),
  ('58', 'Gemerek'),
  ('58', 'Gölova'),
  ('58', 'Gürün'),
  ('58', 'Hafik'),
  ('58', 'Kangal'),
  ('58', 'Koyulhisar'),
  ('58', 'Merkez'),
  ('58', 'Suşehri'),
  ('58', 'Ulaş'),
  ('58', 'Yıldızeli'),
  ('58', 'Zara'),
  ('58', 'İmranlı'),
  ('58', 'Şarkışla'),
  ('59', 'Ergene'),
  ('59', 'Hayrabolu'),
  ('59', 'Kapaklı'),
  ('59', 'Malkara'),
  ('59', 'Marmaraereğlisi'),
  ('59', 'Muratlı'),
  ('59', 'Saray'),
  ('59', 'Süleymanpaşa'),
  ('59', 'Çerkezköy'),
  ('59', 'Çorlu'),
  ('59', 'Şarköy'),
  ('60', 'Almus'),
  ('60', 'Artova'),
  ('60', 'Başçiftlik'),
  ('60', 'Erbaa'),
  ('60', 'Merkez'),
  ('60', 'Niksar'),
  ('60', 'Pazar'),
  ('60', 'Reşadiye'),
  ('60', 'Sulusaray'),
  ('60', 'Turhal'),
  ('60', 'Yeşilyurt'),
  ('60', 'Zile'),
  ('61', 'Akçaabat'),
  ('61', 'Araklı'),
  ('61', 'Arsin'),
  ('61', 'Beşikdüzü'),
  ('61', 'Dernekpazarı'),
  ('61', 'Düzköy'),
  ('61', 'Hayrat'),
  ('61', 'Köprübaşı'),
  ('61', 'Maçka'),
  ('61', 'Of'),
  ('61', 'Ortahisar'),
  ('61', 'Sürmene'),
  ('61', 'Tonya'),
  ('61', 'Vakfıkebir'),
  ('61', 'Yomra'),
  ('61', 'Çarşıbaşı'),
  ('61', 'Çaykara'),
  ('61', 'Şalpazarı'),
  ('62', 'Hozat'),
  ('62', 'Mazgirt'),
  ('62', 'Merkez'),
  ('62', 'Nazımiye'),
  ('62', 'Ovacık'),
  ('62', 'Pertek'),
  ('62', 'Pülümür'),
  ('62', 'Çemişgezek'),
  ('63', 'Akçakale'),
  ('63', 'Birecik'),
  ('63', 'Bozova'),
  ('63', 'Ceylanpınar'),
  ('63', 'Eyyübiye'),
  ('63', 'Halfeti'),
  ('63', 'Haliliye'),
  ('63', 'Harran'),
  ('63', 'Hilvan'),
  ('63', 'Karaköprü'),
  ('63', 'Siverek'),
  ('63', 'Suruç'),
  ('63', 'Viranşehir'),
  ('64', 'Banaz'),
  ('64', 'Eşme'),
  ('64', 'Karahallı'),
  ('64', 'Merkez'),
  ('64', 'Sivaslı'),
  ('64', 'Ulubey'),
  ('65', 'Bahçesaray'),
  ('65', 'Başkale'),
  ('65', 'Edremit'),
  ('65', 'Erciş'),
  ('65', 'Gevaş'),
  ('65', 'Gürpınar'),
  ('65', 'Muradiye'),
  ('65', 'Saray'),
  ('65', 'Tuşba'),
  ('65', 'Çaldıran'),
  ('65', 'Çatak'),
  ('65', 'Özalp'),
  ('65', 'İpekyolu'),
  ('66', 'Akdağmadeni'),
  ('66', 'Aydıncık'),
  ('66', 'Boğazlıyan'),
  ('66', 'Kadışehri'),
  ('66', 'Merkez'),
  ('66', 'Saraykent'),
  ('66', 'Sarıkaya'),
  ('66', 'Sorgun'),
  ('66', 'Yenifakılı'),
  ('66', 'Yerköy'),
  ('66', 'Çandır'),
  ('66', 'Çayıralan'),
  ('66', 'Çekerek'),
  ('66', 'Şefaatli'),
  ('67', 'Alaplı'),
  ('67', 'Devrek'),
  ('67', 'Ereğli'),
  ('67', 'Gökçebey'),
  ('67', 'Kilimli'),
  ('67', 'Kozlu'),
  ('67', 'Merkez'),
  ('67', 'Çaycuma'),
  ('68', 'Ağaçören'),
  ('68', 'Eskil'),
  ('68', 'Gülağaç'),
  ('68', 'Güzelyurt'),
  ('68', 'Merkez'),
  ('68', 'Ortaköy'),
  ('68', 'Sarıyahşi'),
  ('68', 'Sultanhanı'),
  ('69', 'Aydıntepe'),
  ('69', 'Demirözü'),
  ('69', 'Merkez'),
  ('70', 'Ayrancı'),
  ('70', 'Başyayla'),
  ('70', 'Ermenek'),
  ('70', 'Kazımkarabekir'),
  ('70', 'Merkez'),
  ('70', 'Sarıveliler'),
  ('71', 'Bahşılı'),
  ('71', 'Balışeyh'),
  ('71', 'Delice'),
  ('71', 'Karakeçili'),
  ('71', 'Keskin'),
  ('71', 'Merkez'),
  ('71', 'Sulakyurt'),
  ('71', 'Yahşihan'),
  ('71', 'Çelebi'),
  ('72', 'Beşiri'),
  ('72', 'Gercüş'),
  ('72', 'Hasankeyf'),
  ('72', 'Kozluk'),
  ('72', 'Merkez'),
  ('72', 'Sason'),
  ('73', 'Beytüşşebap'),
  ('73', 'Cizre'),
  ('73', 'Güçlükonak'),
  ('73', 'Merkez'),
  ('73', 'Silopi'),
  ('73', 'Uludere'),
  ('73', 'İdil'),
  ('74', 'Amasra'),
  ('74', 'Kurucaşile'),
  ('74', 'Merkez'),
  ('74', 'Ulus'),
  ('75', 'Damal'),
  ('75', 'Göle'),
  ('75', 'Hanak'),
  ('75', 'Merkez'),
  ('75', 'Posof'),
  ('75', 'Çıldır'),
  ('76', 'Aralık'),
  ('76', 'Karakoyunlu'),
  ('76', 'Merkez'),
  ('76', 'Tuzluca'),
  ('77', 'Altınova'),
  ('77', 'Armutlu'),
  ('77', 'Merkez'),
  ('77', 'Termal'),
  ('77', 'Çiftlikköy'),
  ('77', 'Çınarcık'),
  ('78', 'Eflani'),
  ('78', 'Eskipazar'),
  ('78', 'Merkez'),
  ('78', 'Ovacık'),
  ('78', 'Safranbolu'),
  ('78', 'Yenice'),
  ('79', 'Elbeyli'),
  ('79', 'Merkez'),
  ('79', 'Musabeyli'),
  ('79', 'Polateli'),
  ('80', 'Bahçe'),
  ('80', 'Düziçi'),
  ('80', 'Hasanbeyli'),
  ('80', 'Kadirli'),
  ('80', 'Merkez'),
  ('80', 'Sumbas'),
  ('80', 'Toprakkale'),
  ('81', 'Akçakoca'),
  ('81', 'Cumayeri'),
  ('81', 'Gölyaka'),
  ('81', 'Gümüşova'),
  ('81', 'Kaynaşlı'),
  ('81', 'Merkez'),
  ('81', 'Yığılca'),
  ('81', 'Çilimli')
) as d(plate, name)
join regions p
  on p.country_code = 'TR' and p.level = 1 and p.code = d.plate
on conflict (country_code, level, parent_id, name) do nothing;


-- ============ 20260901220000_structured_address.sql ============
-- ============================================================
-- Yapılandırılmış adres
--
-- companies.city / district ve rfqs.city serbest metindi. Kullanıcı
-- "İstanbul", "istanbul", "Istanbul" yazabildiği için şehir filtresi
-- hem eksik hem gürültülü sonuç veriyordu.
--
-- Metin kolonları KALDIRILMIYOR: arama sorguları ve dış entegrasyonlar
-- onlara bakıyor. Bunun yerine seçim FK'ye yazılıyor ve bir tetik metin
-- kolonlarını resmî addan türetiyor. Böylece tek doğru kaynak regions
-- tablosu olurken mevcut hiçbir sorgu bozulmuyor.
-- ============================================================

alter table companies
  add column if not exists country_code char(2) references countries(code),
  add column if not exists province_id uuid references regions(id),
  add column if not exists district_id uuid references regions(id);

alter table rfqs
  add column if not exists country_code char(2) references countries(code),
  add column if not exists province_id uuid references regions(id),
  add column if not exists district_id uuid references regions(id);

create index if not exists companies_province_idx on companies (province_id);
create index if not exists rfqs_province_idx on rfqs (province_id);

/*
  Seçilen bölgenin adını metin kolonlarına yazar.

  SECURITY DEFINER YOK: yalnızca kendi satırının metnini normalleştirir,
  yükseltilmiş yetkiye ihtiyacı yok.

  district_id, province_id'nin çocuğu değilse yazılmaz — arayüz il
  değiştirip ilçeyi güncellemeyi unutursa veri sessizce tutarsız
  kalmasın diye.
*/
create or replace function public.sync_region_names()
returns trigger
language plpgsql
as $$
declare
  province_name text;
  district_name text;
begin
  if new.province_id is not null then
    select r.name into province_name
    from regions r
    where r.id = new.province_id and r.level = 1;

    if province_name is null then
      raise exception 'province_id bir il kaydı değil (%).', new.province_id;
    end if;
    new.city := province_name;
  end if;

  if new.district_id is not null then
    select r.name into district_name
    from regions r
    where r.id = new.district_id
      and r.level = 2
      and r.parent_id = new.province_id;

    if district_name is null then
      raise exception
        'district_id seçilen ile ait bir ilçe değil (ilçe %, il %).',
        new.district_id, new.province_id;
    end if;
  end if;

  return new;
end
$$;

drop trigger if exists companies_sync_region on companies;
create trigger companies_sync_region
  before insert or update of province_id, district_id on companies
  for each row execute function public.sync_region_names();

drop trigger if exists rfqs_sync_region on rfqs;
create trigger rfqs_sync_region
  before insert or update of province_id, district_id on rfqs
  for each row execute function public.sync_region_names();

-- companies.district metnini de senkronla; rfqs'te böyle bir kolon yok.
create or replace function public.sync_company_district()
returns trigger
language plpgsql
as $$
begin
  if new.district_id is not null then
    select r.name into new.district from regions r where r.id = new.district_id;
  end if;
  return new;
end
$$;

drop trigger if exists companies_sync_district on companies;
create trigger companies_sync_district
  before insert or update of district_id on companies
  for each row execute function public.sync_company_district();

-- ---------- Mevcut kayıtları eşle ----------
-- Serbest metin girilmiş şehirleri resmî adla eşleştirip FK'yi doldurur.
-- Eşleşmeyen kayıtlar olduğu gibi kalır; veri kaybı yok.
update companies c
set province_id = r.id, country_code = coalesce(c.country_code, 'TR')
from regions r
where r.country_code = 'TR'
  and r.level = 1
  and c.province_id is null
  and c.city is not null
  and lower(trim(c.city)) = lower(r.name);

update rfqs q
set province_id = r.id, country_code = coalesce(q.country_code, 'TR')
from regions r
where r.country_code = 'TR'
  and r.level = 1
  and q.province_id is null
  and q.city is not null
  and lower(trim(q.city)) = lower(r.name);


-- ============ 20260901230000_category_tree.sql ============
-- ============================================================
-- Kategori ağacı: 19 kök, 143 alt kategori
--
-- Önceki ağaçta 12 kökün 5'i tamamen boştu; alıcı "Kimya" ya da "Yapı"
-- seçtiğinde hiçbir daralma yapamıyordu. B2B'de kategori, aramanın
-- kendisidir: yeterince derin değilse alıcı serbest metne düşer ve
-- yanlış tedarikçiye ulaşır.
--
-- MEVCUT SATIRLAR KORUNUR. Aynı kavramı anlatan kategoriler yeniden
-- ADLANDIRILIR (slug'ları üzerinden eşleşerek), yenileri eklenir.
-- Böylece hâlihazırda o kategoriye bağlı ürünler yerinde kalır.
-- ============================================================

-- ---------- Kök kategoriler ----------
insert into categories (slug, name, parent_id, sort_order) values
  ('ambalaj', 'Ambalaj', null, 10),
  ('tekstil', 'Tekstil ve Hazır Giyim', null, 20),
  ('gida', 'Gıda ve İçecek', null, 30),
  ('yapi', 'Yapı ve İnşaat', null, 40),
  ('makine', 'Makine ve Ekipman', null, 50),
  ('kimya', 'Kimya ve Petrokimya', null, 60),
  ('plastik', 'Plastik ve Kauçuk', null, 70),
  ('metal-madencilik', 'Metal ve Madencilik', null, 80),
  ('elektronik', 'Elektrik ve Elektronik', null, 90),
  ('otomotiv', 'Otomotiv ve Yedek Parça', null, 100),
  ('mobilya-ev-yasam', 'Mobilya ve Ev Yaşam', null, 110),
  ('kozmetik', 'Kozmetik ve Kişisel Bakım', null, 120),
  ('temizlik-hijyen', 'Temizlik ve Hijyen', null, 130),
  ('medikal-saglik', 'Medikal ve Sağlık', null, 140),
  ('tarim-hayvancilik', 'Tarım ve Hayvancılık', null, 150),
  ('hirdavat', 'Hırdavat ve El Aletleri', null, 160),
  ('kirtasiye', 'Kırtasiye ve Ofis', null, 170),
  ('oyuncak-hobi-spor', 'Oyuncak, Hobi ve Spor', null, 180),
  ('lojistik-depolama', 'Lojistik ve Depolama', null, 190)
on conflict (slug) do update set
  name = excluded.name,
  parent_id = null,
  sort_order = excluded.sort_order;

-- ---------- Alt kategoriler ----------
insert into categories (slug, name, parent_id, sort_order)
select v.slug, v.name, p.id, v.sort_order
from (values
  ('karton-kutu', 'Karton Kutu ve Koli', 'ambalaj', 10),
  ('oluklu-mukavva', 'Oluklu Mukavva', 'ambalaj', 20),
  ('plastik-ambalaj', 'Plastik Ambalaj', 'ambalaj', 30),
  ('cam-ambalaj', 'Cam Ambalaj', 'ambalaj', 40),
  ('metal-ambalaj', 'Metal Ambalaj ve Teneke', 'ambalaj', 50),
  ('esnek-ambalaj', 'Esnek Ambalaj ve Film', 'ambalaj', 60),
  ('etiket-baski', 'Etiket ve Baskı', 'ambalaj', 70),
  ('koli-bandi', 'Koli Bandı ve Streç', 'ambalaj', 80),
  ('palet-tasima-kabi', 'Palet ve Taşıma Kabı', 'ambalaj', 90),
  ('kozmetik-ilac-ambalaji', 'Kozmetik ve İlaç Ambalajı', 'ambalaj', 100),
  ('kumas', 'Kumaş', 'tekstil', 10),
  ('iplik', 'İplik ve Elyaf', 'tekstil', 20),
  ('orme-giyim', 'Örme Giyim', 'tekstil', 30),
  ('dokuma-giyim', 'Dokuma Giyim', 'tekstil', 40),
  ('is-elbisesi-uniforma', 'İş Elbisesi ve Üniforma', 'tekstil', 50),
  ('ev-tekstili', 'Ev Tekstili', 'tekstil', 60),
  ('havlu-bornoz', 'Havlu ve Bornoz', 'tekstil', 70),
  ('corap', 'Çorap', 'tekstil', 80),
  ('deri-ayakkabi', 'Deri ve Ayakkabı', 'tekstil', 90),
  ('teknik-tekstil', 'Teknik Tekstil', 'tekstil', 100),
  ('aksesuar-tuhafiye', 'Aksesuar ve Tuhafiye', 'tekstil', 110),
  ('kuru-gida', 'Kuru Gıda ve Bakliyat', 'gida', 10),
  ('kuruyemis-kuru-meyve', 'Kuruyemiş ve Kuru Meyve', 'gida', 20),
  ('un-unlu-mamul', 'Un ve Unlu Mamul', 'gida', 30),
  ('yag-zeytinyagi', 'Yağ ve Zeytinyağı', 'gida', 40),
  ('sut-urunleri', 'Süt ve Süt Ürünleri', 'gida', 50),
  ('et-urunleri', 'Et ve Et Ürünleri', 'gida', 60),
  ('su-urunleri', 'Su Ürünleri', 'gida', 70),
  ('taze-meyve-sebze', 'Taze Meyve Sebze', 'gida', 80),
  ('dondurulmus-gida', 'Dondurulmuş Gıda', 'gida', 90),
  ('sekerleme-cikolata', 'Şekerleme ve Çikolata', 'gida', 100),
  ('icecek', 'İçecek', 'gida', 110),
  ('baharat-cesni', 'Baharat ve Çeşni', 'gida', 120),
  ('gida-katki', 'Gıda Katkı Maddeleri', 'gida', 130),
  ('cimento-beton', 'Çimento ve Beton', 'yapi', 10),
  ('seramik-karo', 'Seramik ve Karo', 'yapi', 20),
  ('dogal-tas-mermer', 'Doğal Taş ve Mermer', 'yapi', 30),
  ('yalitim', 'Yalıtım Malzemeleri', 'yapi', 40),
  ('boya-vernik', 'Boya ve Vernik', 'yapi', 50),
  ('kapi-pencere', 'Kapı ve Pencere', 'yapi', 60),
  ('tesisat-boru', 'Tesisat ve Boru', 'yapi', 70),
  ('yapi-kimyasallari', 'Yapı Kimyasalları', 'yapi', 80),
  ('cati-cephe', 'Çatı ve Cephe', 'yapi', 90),
  ('zemin-kaplama', 'Zemin Kaplama', 'yapi', 100),
  ('prefabrik-konteyner', 'Prefabrik ve Konteyner Yapı', 'yapi', 110),
  ('gida-isleme-makineleri', 'Gıda İşleme Makineleri', 'makine', 10),
  ('tekstil-makineleri', 'Tekstil Makineleri', 'makine', 20),
  ('ambalaj-makineleri', 'Ambalaj Makineleri', 'makine', 30),
  ('plastik-makineleri', 'Plastik İşleme Makineleri', 'makine', 40),
  ('cnc-tezgah', 'Metal İşleme ve CNC', 'makine', 50),
  ('tarim-makineleri', 'Tarım Makineleri', 'makine', 60),
  ('is-makineleri', 'İş Makineleri', 'makine', 70),
  ('kompresor-pompa', 'Kompresör ve Pompa', 'makine', 80),
  ('jenerator-enerji', 'Jeneratör ve Enerji', 'makine', 90),
  ('yedek-parca-rulman', 'Yedek Parça ve Rulman', 'makine', 100),
  ('endustriyel-kimyasallar', 'Endüstriyel Kimyasallar', 'kimya', 10),
  ('polimer-recine', 'Polimer ve Reçine', 'kimya', 20),
  ('pigment-boyarmadde', 'Boya Hammaddesi ve Pigment', 'kimya', 30),
  ('yapistirici', 'Yapıştırıcı ve Kimyasal', 'kimya', 40),
  ('temizlik-kimyasallari', 'Temizlik Kimyasalları', 'kimya', 50),
  ('gubre-tarim-kimyasi', 'Gübre ve Tarım Kimyası', 'kimya', 60),
  ('laboratuvar-kimyasallari', 'Laboratuvar Kimyasalları', 'kimya', 70),
  ('madeni-yag', 'Yağlar ve Madeni Yağ', 'kimya', 80),
  ('plastik-hammadde', 'Plastik Hammadde', 'plastik', 10),
  ('enjeksiyon-urunleri', 'Enjeksiyon Ürünleri', 'plastik', 20),
  ('plastik-kasa-bidon', 'Plastik Kasa ve Bidon', 'plastik', 30),
  ('plastik-boru-profil', 'Boru ve Profil', 'plastik', 40),
  ('kaucuk-conta', 'Kauçuk ve Conta', 'plastik', 50),
  ('levha-film', 'Levha ve Film', 'plastik', 60),
  ('demir-celik', 'Demir ve Çelik', 'metal-madencilik', 10),
  ('paslanmaz-celik', 'Paslanmaz Çelik', 'metal-madencilik', 20),
  ('aluminyum', 'Alüminyum', 'metal-madencilik', 30),
  ('bakir-pirinc', 'Bakır ve Pirinç', 'metal-madencilik', 40),
  ('sac-profil', 'Sac ve Profil', 'metal-madencilik', 50),
  ('dokum-talasli-imalat', 'Döküm ve Talaşlı İmalat', 'metal-madencilik', 60),
  ('maden-cevher', 'Maden ve Cevher', 'metal-madencilik', 70),
  ('hurda-geri-donusum', 'Hurda ve Geri Dönüşüm', 'metal-madencilik', 80),
  ('kablo-konnektor', 'Kablo ve İletken', 'elektronik', 10),
  ('aydinlatma', 'Aydınlatma ve LED', 'elektronik', 20),
  ('pano-salt', 'Elektrik Panosu ve Şalt', 'elektronik', 30),
  ('elektronik-modul', 'Elektronik Bileşen', 'elektronik', 40),
  ('gunes-enerjisi-panel', 'Güneş Enerjisi ve Panel', 'elektronik', 50),
  ('batarya-enerji-depolama', 'Batarya ve Enerji Depolama', 'elektronik', 60),
  ('beyaz-esya-kucuk-ev', 'Beyaz Eşya ve Küçük Ev Aleti', 'elektronik', 70),
  ('bilisim-donanimi', 'Bilişim Donanımı', 'elektronik', 80),
  ('motor-sanziman', 'Motor ve Şanzıman Parçaları', 'otomotiv', 10),
  ('fren-suspansiyon', 'Fren ve Süspansiyon', 'otomotiv', 20),
  ('kaporta-aksesuar', 'Kaporta ve Aksesuar', 'otomotiv', 30),
  ('lastik', 'Lastik ve Jant', 'otomotiv', 40),
  ('oto-elektrik', 'Oto Elektrik', 'otomotiv', 50),
  ('ticari-arac-romork', 'Ticari Araç ve Römork', 'otomotiv', 60),
  ('oto-kimyasallari', 'Oto Kimyasalları', 'otomotiv', 70),
  ('ofis-mobilyasi', 'Ofis Mobilyası', 'mobilya-ev-yasam', 10),
  ('ev-mobilyasi', 'Ev Mobilyası', 'mobilya-ev-yasam', 20),
  ('otel-kontrat-mobilya', 'Otel ve Kontrat Mobilya', 'mobilya-ev-yasam', 30),
  ('mutfak-banyo', 'Mutfak ve Banyo', 'mobilya-ev-yasam', 40),
  ('bahce-dis-mekan', 'Bahçe ve Dış Mekân', 'mobilya-ev-yasam', 50),
  ('ev-dekorasyon', 'Ev Dekorasyon', 'mobilya-ev-yasam', 60),
  ('mobilya-aksesuari', 'Mobilya Aksesuarı', 'mobilya-ev-yasam', 70),
  ('cilt-bakimi', 'Cilt Bakımı', 'kozmetik', 10),
  ('sac-bakimi', 'Saç Bakımı', 'kozmetik', 20),
  ('makyaj', 'Makyaj', 'kozmetik', 30),
  ('parfum-deodorant', 'Parfüm ve Deodorant', 'kozmetik', 40),
  ('sabun-dus', 'Sabun ve Duş Ürünleri', 'kozmetik', 50),
  ('bebek-bakim', 'Bebek Bakım', 'kozmetik', 60),
  ('ozel-uretim-private-label', 'Özel Üretim (Private Label)', 'kozmetik', 70),
  ('endustriyel-temizlik', 'Endüstriyel Temizlik', 'temizlik-hijyen', 10),
  ('kagit-urunleri', 'Kâğıt Ürünleri', 'temizlik-hijyen', 20),
  ('camasir-bulasik', 'Çamaşır ve Bulaşık', 'temizlik-hijyen', 30),
  ('dezenfektan', 'Dezenfektan', 'temizlik-hijyen', 40),
  ('temizlik-ekipmani', 'Temizlik Ekipmanı', 'temizlik-hijyen', 50),
  ('tibbi-sarf', 'Tıbbi Sarf Malzeme', 'medikal-saglik', 10),
  ('tibbi-cihaz', 'Tıbbi Cihaz', 'medikal-saglik', 20),
  ('kisisel-koruyucu-donanim', 'Kişisel Koruyucu Donanım', 'medikal-saglik', 30),
  ('laboratuvar-ekipmani', 'Laboratuvar Ekipmanı', 'medikal-saglik', 40),
  ('ilac-takviye', 'İlaç ve Takviye', 'medikal-saglik', 50),
  ('ortopedi-rehabilitasyon', 'Ortopedi ve Rehabilitasyon', 'medikal-saglik', 60),
  ('tohum-fide', 'Tohum ve Fide', 'tarim-hayvancilik', 10),
  ('sera-ekipman', 'Sera ve Ekipman', 'tarim-hayvancilik', 20),
  ('sulama-sistemleri', 'Sulama Sistemleri', 'tarim-hayvancilik', 30),
  ('yem-hayvan-besleme', 'Yem ve Hayvan Besleme', 'tarim-hayvancilik', 40),
  ('hayvancilik-ekipmani', 'Hayvancılık Ekipmanı', 'tarim-hayvancilik', 50),
  ('su-urunleri-yetistiriciligi', 'Su Ürünleri Yetiştiriciliği', 'tarim-hayvancilik', 60),
  ('el-aletleri', 'El Aletleri', 'hirdavat', 10),
  ('elektrikli-el-aleti', 'Elektrikli El Aleti', 'hirdavat', 20),
  ('baglanti-elemanlari', 'Bağlantı Elemanları', 'hirdavat', 30),
  ('kesici-takim', 'Kesici Takım', 'hirdavat', 40),
  ('kilit-mentese', 'Kilit ve Menteşe', 'hirdavat', 50),
  ('is-guvenligi-ekipmani', 'İş Güvenliği Ekipmanı', 'hirdavat', 60),
  ('kagit-defter', 'Kâğıt ve Defter', 'kirtasiye', 10),
  ('yazi-gerecleri', 'Yazı Gereçleri', 'kirtasiye', 20),
  ('ofis-sarf', 'Ofis Sarf Malzemesi', 'kirtasiye', 30),
  ('baski-toner', 'Baskı ve Toner', 'kirtasiye', 40),
  ('promosyon-urunleri', 'Promosyon Ürünleri', 'kirtasiye', 50),
  ('oyuncak', 'Oyuncak', 'oyuncak-hobi-spor', 10),
  ('spor-malzemesi', 'Spor Malzemesi', 'oyuncak-hobi-spor', 20),
  ('kamp-outdoor', 'Kamp ve Outdoor', 'oyuncak-hobi-spor', 30),
  ('hobi-el-sanatlari', 'Hobi ve El Sanatları', 'oyuncak-hobi-spor', 40),
  ('parti-hediyelik', 'Parti ve Hediyelik', 'oyuncak-hobi-spor', 50),
  ('raf-depo-sistemleri', 'Raf ve Depo Sistemleri', 'lojistik-depolama', 10),
  ('istif-tasima-ekipmani', 'İstif ve Taşıma Ekipmanı', 'lojistik-depolama', 20),
  ('soguk-zincir-ekipmani', 'Soğuk Zincir Ekipmanı', 'lojistik-depolama', 30),
  ('konteyner-tasima-kabi', 'Konteyner ve Taşıma Kabı', 'lojistik-depolama', 40)
) as v(slug, name, parent_slug, sort_order)
join categories p on p.slug = v.parent_slug
on conflict (slug) do update set
  name = excluded.name,
  parent_id = excluded.parent_id,
  sort_order = excluded.sort_order;

-- ---------- Çeviriler ----------
-- Her dil kendi slug'ını taşır: /tr/kategori/ambalaj, /en/category/packaging.
insert into category_translations (category_id, locale, name, slug)
select c.id, v.locale, v.name, v.slug
from (values
  ('ambalaj', 'tr', 'Ambalaj', 'ambalaj'),
  ('ambalaj', 'en', 'Packaging', 'packaging'),
  ('ambalaj', 'ru', 'Упаковка', 'upakovka'),
  ('karton-kutu', 'tr', 'Karton Kutu ve Koli', 'karton-kutu-koli'),
  ('karton-kutu', 'en', 'Cardboard Boxes', 'cardboard-boxes'),
  ('karton-kutu', 'ru', 'Картонные коробки', 'kartonnye-korobki'),
  ('oluklu-mukavva', 'tr', 'Oluklu Mukavva', 'oluklu-mukavva'),
  ('oluklu-mukavva', 'en', 'Corrugated Board', 'corrugated-board'),
  ('oluklu-mukavva', 'ru', 'Гофрокартон', 'gofrokarton'),
  ('plastik-ambalaj', 'tr', 'Plastik Ambalaj', 'plastik-ambalaj'),
  ('plastik-ambalaj', 'en', 'Plastic Packaging', 'plastic-packaging'),
  ('plastik-ambalaj', 'ru', 'Пластиковая упаковка', 'plastikovaya-upakovka'),
  ('cam-ambalaj', 'tr', 'Cam Ambalaj', 'cam-ambalaj'),
  ('cam-ambalaj', 'en', 'Glass Packaging', 'glass-packaging'),
  ('cam-ambalaj', 'ru', 'Стеклянная тара', 'steklyannaya-tara'),
  ('metal-ambalaj', 'tr', 'Metal Ambalaj ve Teneke', 'metal-ambalaj'),
  ('metal-ambalaj', 'en', 'Metal Cans', 'metal-cans'),
  ('metal-ambalaj', 'ru', 'Металлическая тара', 'metallicheskaya-tara'),
  ('esnek-ambalaj', 'tr', 'Esnek Ambalaj ve Film', 'esnek-ambalaj'),
  ('esnek-ambalaj', 'en', 'Flexible Packaging', 'flexible-packaging'),
  ('esnek-ambalaj', 'ru', 'Гибкая упаковка', 'gibkaya-upakovka'),
  ('etiket-baski', 'tr', 'Etiket ve Baskı', 'etiket-baski'),
  ('etiket-baski', 'en', 'Labels and Printing', 'labels-printing'),
  ('etiket-baski', 'ru', 'Этикетки и печать', 'etiketki-pechat'),
  ('koli-bandi', 'tr', 'Koli Bandı ve Streç', 'koli-bandi-strec'),
  ('koli-bandi', 'en', 'Tape and Stretch Film', 'tape-stretch-film'),
  ('koli-bandi', 'ru', 'Скотч и стрейч', 'skotch-streych'),
  ('palet-tasima-kabi', 'tr', 'Palet ve Taşıma Kabı', 'palet-tasima-kabi'),
  ('palet-tasima-kabi', 'en', 'Pallets and Crates', 'pallets-crates'),
  ('palet-tasima-kabi', 'ru', 'Паллеты и ящики', 'pallety-yashchiki'),
  ('kozmetik-ilac-ambalaji', 'tr', 'Kozmetik ve İlaç Ambalajı', 'kozmetik-ilac-ambalaji'),
  ('kozmetik-ilac-ambalaji', 'en', 'Cosmetic and Pharma Packaging', 'cosmetic-pharma-packaging'),
  ('kozmetik-ilac-ambalaji', 'ru', 'Упаковка для косметики и фармы', 'upakovka-kosmetika-farma'),
  ('tekstil', 'tr', 'Tekstil ve Hazır Giyim', 'tekstil-hazir-giyim'),
  ('tekstil', 'en', 'Textile and Apparel', 'textile-apparel'),
  ('tekstil', 'ru', 'Текстиль и одежда', 'tekstil-odezhda'),
  ('kumas', 'tr', 'Kumaş', 'kumas'),
  ('kumas', 'en', 'Fabrics', 'fabrics'),
  ('kumas', 'ru', 'Ткани', 'tkani'),
  ('iplik', 'tr', 'İplik ve Elyaf', 'iplik-elyaf'),
  ('iplik', 'en', 'Yarn and Fibre', 'yarn-fibre'),
  ('iplik', 'ru', 'Пряжа и волокно', 'pryazha-volokno'),
  ('orme-giyim', 'tr', 'Örme Giyim', 'orme-giyim'),
  ('orme-giyim', 'en', 'Knitwear', 'knitwear'),
  ('orme-giyim', 'ru', 'Трикотаж', 'trikotazh'),
  ('dokuma-giyim', 'tr', 'Dokuma Giyim', 'dokuma-giyim'),
  ('dokuma-giyim', 'en', 'Woven Apparel', 'woven-apparel'),
  ('dokuma-giyim', 'ru', 'Тканая одежда', 'tkanaya-odezhda'),
  ('is-elbisesi-uniforma', 'tr', 'İş Elbisesi ve Üniforma', 'is-elbisesi-uniforma'),
  ('is-elbisesi-uniforma', 'en', 'Workwear and Uniforms', 'workwear-uniforms'),
  ('is-elbisesi-uniforma', 'ru', 'Спецодежда и униформа', 'spetsodezhda-uniforma'),
  ('ev-tekstili', 'tr', 'Ev Tekstili', 'ev-tekstili'),
  ('ev-tekstili', 'en', 'Home Textiles', 'home-textiles'),
  ('ev-tekstili', 'ru', 'Домашний текстиль', 'domashniy-tekstil'),
  ('havlu-bornoz', 'tr', 'Havlu ve Bornoz', 'havlu-bornoz'),
  ('havlu-bornoz', 'en', 'Towels and Bathrobes', 'towels-bathrobes'),
  ('havlu-bornoz', 'ru', 'Полотенца и халаты', 'polotentsa-khalaty'),
  ('corap', 'tr', 'Çorap', 'corap'),
  ('corap', 'en', 'Socks and Hosiery', 'socks-hosiery'),
  ('corap', 'ru', 'Носки и чулки', 'noski-chulki'),
  ('deri-ayakkabi', 'tr', 'Deri ve Ayakkabı', 'deri-ayakkabi'),
  ('deri-ayakkabi', 'en', 'Leather and Footwear', 'leather-footwear'),
  ('deri-ayakkabi', 'ru', 'Кожа и обувь', 'kozha-obuv'),
  ('teknik-tekstil', 'tr', 'Teknik Tekstil', 'teknik-tekstil'),
  ('teknik-tekstil', 'en', 'Technical Textiles', 'technical-textiles'),
  ('teknik-tekstil', 'ru', 'Технический текстиль', 'tekhnicheskiy-tekstil'),
  ('aksesuar-tuhafiye', 'tr', 'Aksesuar ve Tuhafiye', 'aksesuar-tuhafiye'),
  ('aksesuar-tuhafiye', 'en', 'Trims and Accessories', 'trims-accessories'),
  ('aksesuar-tuhafiye', 'ru', 'Фурнитура и аксессуары', 'furnitura-aksessuary'),
  ('gida', 'tr', 'Gıda ve İçecek', 'gida-icecek'),
  ('gida', 'en', 'Food and Beverage', 'food-beverage'),
  ('gida', 'ru', 'Продукты и напитки', 'produkty-napitki'),
  ('kuru-gida', 'tr', 'Kuru Gıda ve Bakliyat', 'kuru-gida-bakliyat'),
  ('kuru-gida', 'en', 'Dry Goods and Pulses', 'dry-goods-pulses'),
  ('kuru-gida', 'ru', 'Крупы и бобовые', 'krupy-bobovye'),
  ('kuruyemis-kuru-meyve', 'tr', 'Kuruyemiş ve Kuru Meyve', 'kuruyemis-kuru-meyve'),
  ('kuruyemis-kuru-meyve', 'en', 'Nuts and Dried Fruit', 'nuts-dried-fruit'),
  ('kuruyemis-kuru-meyve', 'ru', 'Орехи и сухофрукты', 'orekhi-sukhofrukty'),
  ('un-unlu-mamul', 'tr', 'Un ve Unlu Mamul', 'un-unlu-mamul'),
  ('un-unlu-mamul', 'en', 'Flour and Bakery', 'flour-bakery'),
  ('un-unlu-mamul', 'ru', 'Мука и выпечка', 'muka-vypechka'),
  ('yag-zeytinyagi', 'tr', 'Yağ ve Zeytinyağı', 'yag-zeytinyagi'),
  ('yag-zeytinyagi', 'en', 'Oils and Olive Oil', 'oils-olive-oil'),
  ('yag-zeytinyagi', 'ru', 'Масла и оливковое масло', 'masla-olivkovoe'),
  ('sut-urunleri', 'tr', 'Süt ve Süt Ürünleri', 'sut-urunleri'),
  ('sut-urunleri', 'en', 'Dairy', 'dairy'),
  ('sut-urunleri', 'ru', 'Молочные продукты', 'molochnye-produkty'),
  ('et-urunleri', 'tr', 'Et ve Et Ürünleri', 'et-urunleri'),
  ('et-urunleri', 'en', 'Meat Products', 'meat-products'),
  ('et-urunleri', 'ru', 'Мясные продукты', 'myasnye-produkty'),
  ('su-urunleri', 'tr', 'Su Ürünleri', 'su-urunleri'),
  ('su-urunleri', 'en', 'Seafood', 'seafood'),
  ('su-urunleri', 'ru', 'Морепродукты', 'moreprodukty'),
  ('taze-meyve-sebze', 'tr', 'Taze Meyve Sebze', 'taze-meyve-sebze'),
  ('taze-meyve-sebze', 'en', 'Fresh Produce', 'fresh-produce'),
  ('taze-meyve-sebze', 'ru', 'Свежие фрукты и овощи', 'svezhie-frukty-ovoshchi'),
  ('dondurulmus-gida', 'tr', 'Dondurulmuş Gıda', 'dondurulmus-gida'),
  ('dondurulmus-gida', 'en', 'Frozen Food', 'frozen-food'),
  ('dondurulmus-gida', 'ru', 'Замороженные продукты', 'zamorozhennye-produkty'),
  ('sekerleme-cikolata', 'tr', 'Şekerleme ve Çikolata', 'sekerleme-cikolata'),
  ('sekerleme-cikolata', 'en', 'Confectionery', 'confectionery'),
  ('sekerleme-cikolata', 'ru', 'Кондитерские изделия', 'konditerskie-izdeliya'),
  ('icecek', 'tr', 'İçecek', 'icecek'),
  ('icecek', 'en', 'Beverages', 'beverages'),
  ('icecek', 'ru', 'Напитки', 'napitki'),
  ('baharat-cesni', 'tr', 'Baharat ve Çeşni', 'baharat-cesni'),
  ('baharat-cesni', 'en', 'Spices and Seasonings', 'spices-seasonings'),
  ('baharat-cesni', 'ru', 'Специи и приправы', 'spetsii-pripravy'),
  ('gida-katki', 'tr', 'Gıda Katkı Maddeleri', 'gida-katki'),
  ('gida-katki', 'en', 'Food Additives', 'food-additives'),
  ('gida-katki', 'ru', 'Пищевые добавки', 'pishchevye-dobavki'),
  ('yapi', 'tr', 'Yapı ve İnşaat', 'yapi-insaat'),
  ('yapi', 'en', 'Construction and Building', 'construction-building'),
  ('yapi', 'ru', 'Строительство', 'stroitelstvo'),
  ('cimento-beton', 'tr', 'Çimento ve Beton', 'cimento-beton'),
  ('cimento-beton', 'en', 'Cement and Concrete', 'cement-concrete'),
  ('cimento-beton', 'ru', 'Цемент и бетон', 'tsement-beton'),
  ('seramik-karo', 'tr', 'Seramik ve Karo', 'seramik-karo'),
  ('seramik-karo', 'en', 'Ceramics and Tiles', 'ceramics-tiles'),
  ('seramik-karo', 'ru', 'Керамика и плитка', 'keramika-plitka'),
  ('dogal-tas-mermer', 'tr', 'Doğal Taş ve Mermer', 'dogal-tas-mermer'),
  ('dogal-tas-mermer', 'en', 'Natural Stone and Marble', 'natural-stone-marble'),
  ('dogal-tas-mermer', 'ru', 'Природный камень', 'prirodnyy-kamen'),
  ('yalitim', 'tr', 'Yalıtım Malzemeleri', 'yalitim'),
  ('yalitim', 'en', 'Insulation', 'insulation'),
  ('yalitim', 'ru', 'Изоляция', 'izolyatsiya'),
  ('boya-vernik', 'tr', 'Boya ve Vernik', 'boya-vernik'),
  ('boya-vernik', 'en', 'Paint and Coatings', 'paint-coatings'),
  ('boya-vernik', 'ru', 'Краски и покрытия', 'kraski-pokrytiya'),
  ('kapi-pencere', 'tr', 'Kapı ve Pencere', 'kapi-pencere'),
  ('kapi-pencere', 'en', 'Doors and Windows', 'doors-windows'),
  ('kapi-pencere', 'ru', 'Двери и окна', 'dveri-okna'),
  ('tesisat-boru', 'tr', 'Tesisat ve Boru', 'tesisat-boru'),
  ('tesisat-boru', 'en', 'Plumbing and Pipes', 'plumbing-pipes'),
  ('tesisat-boru', 'ru', 'Сантехника и трубы', 'santekhnika-truby'),
  ('yapi-kimyasallari', 'tr', 'Yapı Kimyasalları', 'yapi-kimyasallari'),
  ('yapi-kimyasallari', 'en', 'Construction Chemicals', 'construction-chemicals'),
  ('yapi-kimyasallari', 'ru', 'Строительная химия', 'stroitelnaya-khimiya'),
  ('cati-cephe', 'tr', 'Çatı ve Cephe', 'cati-cephe'),
  ('cati-cephe', 'en', 'Roofing and Facade', 'roofing-facade'),
  ('cati-cephe', 'ru', 'Кровля и фасад', 'krovlya-fasad'),
  ('zemin-kaplama', 'tr', 'Zemin Kaplama', 'zemin-kaplama'),
  ('zemin-kaplama', 'en', 'Flooring', 'flooring'),
  ('zemin-kaplama', 'ru', 'Напольные покрытия', 'napolnye-pokrytiya'),
  ('prefabrik-konteyner', 'tr', 'Prefabrik ve Konteyner Yapı', 'prefabrik-konteyner'),
  ('prefabrik-konteyner', 'en', 'Prefab and Modular', 'prefab-modular'),
  ('prefabrik-konteyner', 'ru', 'Модульные здания', 'modulnye-zdaniya'),
  ('makine', 'tr', 'Makine ve Ekipman', 'makine-ekipman'),
  ('makine', 'en', 'Machinery and Equipment', 'machinery-equipment'),
  ('makine', 'ru', 'Машины и оборудование', 'mashiny-oborudovanie'),
  ('gida-isleme-makineleri', 'tr', 'Gıda İşleme Makineleri', 'gida-isleme-makineleri'),
  ('gida-isleme-makineleri', 'en', 'Food Processing Machinery', 'food-processing-machinery'),
  ('gida-isleme-makineleri', 'ru', 'Пищевое оборудование', 'pishchevoe-oborudovanie'),
  ('tekstil-makineleri', 'tr', 'Tekstil Makineleri', 'tekstil-makineleri'),
  ('tekstil-makineleri', 'en', 'Textile Machinery', 'textile-machinery'),
  ('tekstil-makineleri', 'ru', 'Текстильное оборудование', 'tekstilnoe-oborudovanie'),
  ('ambalaj-makineleri', 'tr', 'Ambalaj Makineleri', 'ambalaj-makineleri'),
  ('ambalaj-makineleri', 'en', 'Packaging Machinery', 'packaging-machinery'),
  ('ambalaj-makineleri', 'ru', 'Упаковочное оборудование', 'upakovochnoe-oborudovanie'),
  ('plastik-makineleri', 'tr', 'Plastik İşleme Makineleri', 'plastik-makineleri'),
  ('plastik-makineleri', 'en', 'Plastics Machinery', 'plastics-machinery'),
  ('plastik-makineleri', 'ru', 'Оборудование для пластмасс', 'oborudovanie-plastmassy'),
  ('cnc-tezgah', 'tr', 'Metal İşleme ve CNC', 'metal-isleme-cnc'),
  ('cnc-tezgah', 'en', 'Metalworking and CNC', 'metalworking-cnc'),
  ('cnc-tezgah', 'ru', 'Металлообработка и ЧПУ', 'metalloobrabotka-chpu'),
  ('tarim-makineleri', 'tr', 'Tarım Makineleri', 'tarim-makineleri'),
  ('tarim-makineleri', 'en', 'Agricultural Machinery', 'agricultural-machinery'),
  ('tarim-makineleri', 'ru', 'Сельхозтехника', 'selkhoztekhnika'),
  ('is-makineleri', 'tr', 'İş Makineleri', 'is-makineleri'),
  ('is-makineleri', 'en', 'Construction Machinery', 'construction-machinery'),
  ('is-makineleri', 'ru', 'Строительная техника', 'stroitelnaya-tekhnika'),
  ('kompresor-pompa', 'tr', 'Kompresör ve Pompa', 'kompresor-pompa'),
  ('kompresor-pompa', 'en', 'Compressors and Pumps', 'compressors-pumps'),
  ('kompresor-pompa', 'ru', 'Компрессоры и насосы', 'kompressory-nasosy'),
  ('jenerator-enerji', 'tr', 'Jeneratör ve Enerji', 'jenerator-enerji'),
  ('jenerator-enerji', 'en', 'Generators and Power', 'generators-power'),
  ('jenerator-enerji', 'ru', 'Генераторы и энергия', 'generatory-energiya'),
  ('yedek-parca-rulman', 'tr', 'Yedek Parça ve Rulman', 'yedek-parca-rulman'),
  ('yedek-parca-rulman', 'en', 'Spare Parts and Bearings', 'spare-parts-bearings'),
  ('yedek-parca-rulman', 'ru', 'Запчасти и подшипники', 'zapchasti-podshipniki'),
  ('kimya', 'tr', 'Kimya ve Petrokimya', 'kimya-petrokimya'),
  ('kimya', 'en', 'Chemicals and Petrochemicals', 'chemicals-petrochemicals'),
  ('kimya', 'ru', 'Химия и нефтехимия', 'khimiya-neftekhimiya'),
  ('endustriyel-kimyasallar', 'tr', 'Endüstriyel Kimyasallar', 'endustriyel-kimyasallar'),
  ('endustriyel-kimyasallar', 'en', 'Industrial Chemicals', 'industrial-chemicals'),
  ('endustriyel-kimyasallar', 'ru', 'Промышленная химия', 'promyshlennaya-khimiya'),
  ('polimer-recine', 'tr', 'Polimer ve Reçine', 'polimer-recine'),
  ('polimer-recine', 'en', 'Polymers and Resins', 'polymers-resins'),
  ('polimer-recine', 'ru', 'Полимеры и смолы', 'polimery-smoly'),
  ('pigment-boyarmadde', 'tr', 'Boya Hammaddesi ve Pigment', 'pigment-boyarmadde'),
  ('pigment-boyarmadde', 'en', 'Pigments and Dyes', 'pigments-dyes'),
  ('pigment-boyarmadde', 'ru', 'Пигменты и красители', 'pigmenty-krasiteli'),
  ('yapistirici', 'tr', 'Yapıştırıcı ve Kimyasal', 'yapistirici'),
  ('yapistirici', 'en', 'Adhesives', 'adhesives'),
  ('yapistirici', 'ru', 'Клеи', 'klei'),
  ('temizlik-kimyasallari', 'tr', 'Temizlik Kimyasalları', 'temizlik-kimyasallari'),
  ('temizlik-kimyasallari', 'en', 'Cleaning Chemicals', 'cleaning-chemicals'),
  ('temizlik-kimyasallari', 'ru', 'Моющая химия', 'moyushchaya-khimiya'),
  ('gubre-tarim-kimyasi', 'tr', 'Gübre ve Tarım Kimyası', 'gubre-tarim-kimyasi'),
  ('gubre-tarim-kimyasi', 'en', 'Fertilizers and Agrochemicals', 'fertilizers-agrochemicals'),
  ('gubre-tarim-kimyasi', 'ru', 'Удобрения и агрохимия', 'udobreniya-agrokhimiya'),
  ('laboratuvar-kimyasallari', 'tr', 'Laboratuvar Kimyasalları', 'laboratuvar-kimyasallari'),
  ('laboratuvar-kimyasallari', 'en', 'Laboratory Chemicals', 'laboratory-chemicals'),
  ('laboratuvar-kimyasallari', 'ru', 'Лабораторная химия', 'laboratornaya-khimiya'),
  ('madeni-yag', 'tr', 'Yağlar ve Madeni Yağ', 'madeni-yag'),
  ('madeni-yag', 'en', 'Lubricants', 'lubricants'),
  ('madeni-yag', 'ru', 'Смазочные материалы', 'smazochnye-materialy'),
  ('plastik', 'tr', 'Plastik ve Kauçuk', 'plastik-kaucuk'),
  ('plastik', 'en', 'Plastics and Rubber', 'plastics-rubber'),
  ('plastik', 'ru', 'Пластик и резина', 'plastik-rezina'),
  ('plastik-hammadde', 'tr', 'Plastik Hammadde', 'plastik-hammadde'),
  ('plastik-hammadde', 'en', 'Plastic Raw Material', 'plastic-raw-material'),
  ('plastik-hammadde', 'ru', 'Пластиковое сырьё', 'plastikovoe-syre'),
  ('enjeksiyon-urunleri', 'tr', 'Enjeksiyon Ürünleri', 'enjeksiyon-urunleri'),
  ('enjeksiyon-urunleri', 'en', 'Injection Moulded Parts', 'injection-moulded-parts'),
  ('enjeksiyon-urunleri', 'ru', 'Литьё под давлением', 'litye-pod-davleniem'),
  ('plastik-kasa-bidon', 'tr', 'Plastik Kasa ve Bidon', 'plastik-kasa-bidon'),
  ('plastik-kasa-bidon', 'en', 'Crates and Drums', 'crates-drums'),
  ('plastik-kasa-bidon', 'ru', 'Ящики и бочки', 'yashchiki-bochki'),
  ('plastik-boru-profil', 'tr', 'Boru ve Profil', 'plastik-boru-profil'),
  ('plastik-boru-profil', 'en', 'Pipes and Profiles', 'pipes-profiles'),
  ('plastik-boru-profil', 'ru', 'Трубы и профили', 'truby-profili'),
  ('kaucuk-conta', 'tr', 'Kauçuk ve Conta', 'kaucuk-conta'),
  ('kaucuk-conta', 'en', 'Rubber and Seals', 'rubber-seals'),
  ('kaucuk-conta', 'ru', 'Резина и уплотнители', 'rezina-uplotniteli'),
  ('levha-film', 'tr', 'Levha ve Film', 'levha-film'),
  ('levha-film', 'en', 'Sheets and Films', 'sheets-films'),
  ('levha-film', 'ru', 'Листы и плёнки', 'listy-plenki'),
  ('metal-madencilik', 'tr', 'Metal ve Madencilik', 'metal-madencilik'),
  ('metal-madencilik', 'en', 'Metals and Mining', 'metals-mining'),
  ('metal-madencilik', 'ru', 'Металлы и добыча', 'metally-dobycha'),
  ('demir-celik', 'tr', 'Demir ve Çelik', 'demir-celik'),
  ('demir-celik', 'en', 'Iron and Steel', 'iron-steel'),
  ('demir-celik', 'ru', 'Чёрные металлы', 'chernye-metally'),
  ('paslanmaz-celik', 'tr', 'Paslanmaz Çelik', 'paslanmaz-celik'),
  ('paslanmaz-celik', 'en', 'Stainless Steel', 'stainless-steel'),
  ('paslanmaz-celik', 'ru', 'Нержавеющая сталь', 'nerzhaveyushchaya-stal'),
  ('aluminyum', 'tr', 'Alüminyum', 'aluminyum'),
  ('aluminyum', 'en', 'Aluminium', 'aluminium'),
  ('aluminyum', 'ru', 'Алюминий', 'alyuminiy'),
  ('bakir-pirinc', 'tr', 'Bakır ve Pirinç', 'bakir-pirinc'),
  ('bakir-pirinc', 'en', 'Copper and Brass', 'copper-brass'),
  ('bakir-pirinc', 'ru', 'Медь и латунь', 'med-latun'),
  ('sac-profil', 'tr', 'Sac ve Profil', 'sac-profil'),
  ('sac-profil', 'en', 'Sheet and Profile', 'sheet-profile'),
  ('sac-profil', 'ru', 'Лист и профиль', 'list-profil'),
  ('dokum-talasli-imalat', 'tr', 'Döküm ve Talaşlı İmalat', 'dokum-talasli-imalat'),
  ('dokum-talasli-imalat', 'en', 'Casting and Machining', 'casting-machining'),
  ('dokum-talasli-imalat', 'ru', 'Литьё и обработка', 'litye-obrabotka'),
  ('maden-cevher', 'tr', 'Maden ve Cevher', 'maden-cevher'),
  ('maden-cevher', 'en', 'Minerals and Ores', 'minerals-ores'),
  ('maden-cevher', 'ru', 'Минералы и руды', 'mineraly-rudy'),
  ('hurda-geri-donusum', 'tr', 'Hurda ve Geri Dönüşüm', 'hurda-geri-donusum'),
  ('hurda-geri-donusum', 'en', 'Scrap and Recycling', 'scrap-recycling'),
  ('hurda-geri-donusum', 'ru', 'Лом и переработка', 'lom-pererabotka'),
  ('elektronik', 'tr', 'Elektrik ve Elektronik', 'elektrik-elektronik'),
  ('elektronik', 'en', 'Electrical and Electronics', 'electrical-electronics'),
  ('elektronik', 'ru', 'Электрика и электроника', 'elektrika-elektronika'),
  ('kablo-konnektor', 'tr', 'Kablo ve İletken', 'kablo-iletken'),
  ('kablo-konnektor', 'en', 'Cables and Wiring', 'cables-wiring'),
  ('kablo-konnektor', 'ru', 'Кабели и провода', 'kabeli-provoda'),
  ('aydinlatma', 'tr', 'Aydınlatma ve LED', 'aydinlatma-led'),
  ('aydinlatma', 'en', 'Lighting and LED', 'lighting-led'),
  ('aydinlatma', 'ru', 'Освещение и LED', 'osveshchenie-led'),
  ('pano-salt', 'tr', 'Elektrik Panosu ve Şalt', 'pano-salt'),
  ('pano-salt', 'en', 'Switchgear and Panels', 'switchgear-panels'),
  ('pano-salt', 'ru', 'Щиты и коммутация', 'shchity-kommutatsiya'),
  ('elektronik-modul', 'tr', 'Elektronik Bileşen', 'elektronik-bilesen'),
  ('elektronik-modul', 'en', 'Electronic Components', 'electronic-components'),
  ('elektronik-modul', 'ru', 'Электронные компоненты', 'elektronnye-komponenty'),
  ('gunes-enerjisi-panel', 'tr', 'Güneş Enerjisi ve Panel', 'gunes-enerjisi-panel'),
  ('gunes-enerjisi-panel', 'en', 'Solar and PV', 'solar-pv'),
  ('gunes-enerjisi-panel', 'ru', 'Солнечная энергетика', 'solnechnaya-energetika'),
  ('batarya-enerji-depolama', 'tr', 'Batarya ve Enerji Depolama', 'batarya-enerji-depolama'),
  ('batarya-enerji-depolama', 'en', 'Batteries and Storage', 'batteries-storage'),
  ('batarya-enerji-depolama', 'ru', 'Батареи и накопители', 'batarei-nakopiteli'),
  ('beyaz-esya-kucuk-ev', 'tr', 'Beyaz Eşya ve Küçük Ev Aleti', 'beyaz-esya-kucuk-ev'),
  ('beyaz-esya-kucuk-ev', 'en', 'Appliances', 'appliances'),
  ('beyaz-esya-kucuk-ev', 'ru', 'Бытовая техника', 'bytovaya-tekhnika'),
  ('bilisim-donanimi', 'tr', 'Bilişim Donanımı', 'bilisim-donanimi'),
  ('bilisim-donanimi', 'en', 'IT Hardware', 'it-hardware'),
  ('bilisim-donanimi', 'ru', 'ИТ-оборудование', 'it-oborudovanie'),
  ('otomotiv', 'tr', 'Otomotiv ve Yedek Parça', 'otomotiv-yedek-parca'),
  ('otomotiv', 'en', 'Automotive and Parts', 'automotive-parts'),
  ('otomotiv', 'ru', 'Автомобили и запчасти', 'avtomobili-zapchasti'),
  ('motor-sanziman', 'tr', 'Motor ve Şanzıman Parçaları', 'motor-sanziman'),
  ('motor-sanziman', 'en', 'Engine and Transmission', 'engine-transmission'),
  ('motor-sanziman', 'ru', 'Двигатель и трансмиссия', 'dvigatel-transmissiya'),
  ('fren-suspansiyon', 'tr', 'Fren ve Süspansiyon', 'fren-suspansiyon'),
  ('fren-suspansiyon', 'en', 'Brake and Suspension', 'brake-suspension'),
  ('fren-suspansiyon', 'ru', 'Тормоза и подвеска', 'tormoza-podveska'),
  ('kaporta-aksesuar', 'tr', 'Kaporta ve Aksesuar', 'kaporta-aksesuar'),
  ('kaporta-aksesuar', 'en', 'Body Parts and Accessories', 'body-parts-accessories'),
  ('kaporta-aksesuar', 'ru', 'Кузов и аксессуары', 'kuzov-aksessuary'),
  ('lastik', 'tr', 'Lastik ve Jant', 'lastik-jant'),
  ('lastik', 'en', 'Tyres and Wheels', 'tyres-wheels'),
  ('lastik', 'ru', 'Шины и диски', 'shiny-diski'),
  ('oto-elektrik', 'tr', 'Oto Elektrik', 'oto-elektrik'),
  ('oto-elektrik', 'en', 'Automotive Electrics', 'automotive-electrics'),
  ('oto-elektrik', 'ru', 'Автоэлектрика', 'avtoelektrika'),
  ('ticari-arac-romork', 'tr', 'Ticari Araç ve Römork', 'ticari-arac-romork'),
  ('ticari-arac-romork', 'en', 'Commercial Vehicles and Trailers', 'commercial-vehicles-trailers'),
  ('ticari-arac-romork', 'ru', 'Коммерческий транспорт', 'kommercheskiy-transport'),
  ('oto-kimyasallari', 'tr', 'Oto Kimyasalları', 'oto-kimyasallari'),
  ('oto-kimyasallari', 'en', 'Automotive Chemicals', 'automotive-chemicals'),
  ('oto-kimyasallari', 'ru', 'Автохимия', 'avtokhimiya'),
  ('mobilya-ev-yasam', 'tr', 'Mobilya ve Ev Yaşam', 'mobilya-ev-yasam'),
  ('mobilya-ev-yasam', 'en', 'Furniture and Home', 'furniture-home'),
  ('mobilya-ev-yasam', 'ru', 'Мебель и дом', 'mebel-dom'),
  ('ofis-mobilyasi', 'tr', 'Ofis Mobilyası', 'ofis-mobilyasi'),
  ('ofis-mobilyasi', 'en', 'Office Furniture', 'office-furniture'),
  ('ofis-mobilyasi', 'ru', 'Офисная мебель', 'ofisnaya-mebel'),
  ('ev-mobilyasi', 'tr', 'Ev Mobilyası', 'ev-mobilyasi'),
  ('ev-mobilyasi', 'en', 'Home Furniture', 'home-furniture'),
  ('ev-mobilyasi', 'ru', 'Домашняя мебель', 'domashnyaya-mebel'),
  ('otel-kontrat-mobilya', 'tr', 'Otel ve Kontrat Mobilya', 'otel-kontrat-mobilya'),
  ('otel-kontrat-mobilya', 'en', 'Hospitality and Contract', 'hospitality-contract'),
  ('otel-kontrat-mobilya', 'ru', 'Мебель для отелей', 'mebel-dlya-oteley'),
  ('mutfak-banyo', 'tr', 'Mutfak ve Banyo', 'mutfak-banyo'),
  ('mutfak-banyo', 'en', 'Kitchen and Bath', 'kitchen-bath'),
  ('mutfak-banyo', 'ru', 'Кухня и ванная', 'kukhnya-vannaya'),
  ('bahce-dis-mekan', 'tr', 'Bahçe ve Dış Mekân', 'bahce-dis-mekan'),
  ('bahce-dis-mekan', 'en', 'Garden and Outdoor', 'garden-outdoor'),
  ('bahce-dis-mekan', 'ru', 'Сад и улица', 'sad-ulitsa'),
  ('ev-dekorasyon', 'tr', 'Ev Dekorasyon', 'ev-dekorasyon'),
  ('ev-dekorasyon', 'en', 'Home Decor', 'home-decor'),
  ('ev-dekorasyon', 'ru', 'Декор для дома', 'dekor-dlya-doma'),
  ('mobilya-aksesuari', 'tr', 'Mobilya Aksesuarı', 'mobilya-aksesuari'),
  ('mobilya-aksesuari', 'en', 'Furniture Hardware', 'furniture-hardware'),
  ('mobilya-aksesuari', 'ru', 'Мебельная фурнитура', 'mebelnaya-furnitura'),
  ('kozmetik', 'tr', 'Kozmetik ve Kişisel Bakım', 'kozmetik-kisisel-bakim'),
  ('kozmetik', 'en', 'Cosmetics and Personal Care', 'cosmetics-personal-care'),
  ('kozmetik', 'ru', 'Косметика и уход', 'kosmetika-ukhod'),
  ('cilt-bakimi', 'tr', 'Cilt Bakımı', 'cilt-bakimi'),
  ('cilt-bakimi', 'en', 'Skin Care', 'skin-care'),
  ('cilt-bakimi', 'ru', 'Уход за кожей', 'ukhod-za-kozhey'),
  ('sac-bakimi', 'tr', 'Saç Bakımı', 'sac-bakimi'),
  ('sac-bakimi', 'en', 'Hair Care', 'hair-care'),
  ('sac-bakimi', 'ru', 'Уход за волосами', 'ukhod-za-volosami'),
  ('makyaj', 'tr', 'Makyaj', 'makyaj'),
  ('makyaj', 'en', 'Make-up', 'make-up'),
  ('makyaj', 'ru', 'Макияж', 'makiyazh'),
  ('parfum-deodorant', 'tr', 'Parfüm ve Deodorant', 'parfum-deodorant'),
  ('parfum-deodorant', 'en', 'Fragrance and Deodorant', 'fragrance-deodorant'),
  ('parfum-deodorant', 'ru', 'Парфюмерия и дезодоранты', 'parfyumeriya-dezodoranty'),
  ('sabun-dus', 'tr', 'Sabun ve Duş Ürünleri', 'sabun-dus'),
  ('sabun-dus', 'en', 'Soap and Bath', 'soap-bath'),
  ('sabun-dus', 'ru', 'Мыло и гели для душа', 'mylo-geli'),
  ('bebek-bakim', 'tr', 'Bebek Bakım', 'bebek-bakim'),
  ('bebek-bakim', 'en', 'Baby Care', 'baby-care'),
  ('bebek-bakim', 'ru', 'Детский уход', 'detskiy-ukhod'),
  ('ozel-uretim-private-label', 'tr', 'Özel Üretim (Private Label)', 'ozel-uretim-private-label'),
  ('ozel-uretim-private-label', 'en', 'Private Label', 'private-label'),
  ('ozel-uretim-private-label', 'ru', 'Private label', 'private-label'),
  ('temizlik-hijyen', 'tr', 'Temizlik ve Hijyen', 'temizlik-hijyen'),
  ('temizlik-hijyen', 'en', 'Cleaning and Hygiene', 'cleaning-hygiene'),
  ('temizlik-hijyen', 'ru', 'Уборка и гигиена', 'uborka-gigiena'),
  ('endustriyel-temizlik', 'tr', 'Endüstriyel Temizlik', 'endustriyel-temizlik'),
  ('endustriyel-temizlik', 'en', 'Industrial Cleaning', 'industrial-cleaning'),
  ('endustriyel-temizlik', 'ru', 'Промышленная уборка', 'promyshlennaya-uborka'),
  ('kagit-urunleri', 'tr', 'Kâğıt Ürünleri', 'kagit-urunleri'),
  ('kagit-urunleri', 'en', 'Paper Hygiene', 'paper-hygiene'),
  ('kagit-urunleri', 'ru', 'Бумажная гигиена', 'bumazhnaya-gigiena'),
  ('camasir-bulasik', 'tr', 'Çamaşır ve Bulaşık', 'camasir-bulasik'),
  ('camasir-bulasik', 'en', 'Laundry and Dishwash', 'laundry-dishwash'),
  ('camasir-bulasik', 'ru', 'Стирка и мытьё посуды', 'stirka-mytye-posudy'),
  ('dezenfektan', 'tr', 'Dezenfektan', 'dezenfektan'),
  ('dezenfektan', 'en', 'Disinfectants', 'disinfectants'),
  ('dezenfektan', 'ru', 'Дезинфекция', 'dezinfektsiya'),
  ('temizlik-ekipmani', 'tr', 'Temizlik Ekipmanı', 'temizlik-ekipmani'),
  ('temizlik-ekipmani', 'en', 'Cleaning Equipment', 'cleaning-equipment'),
  ('temizlik-ekipmani', 'ru', 'Уборочный инвентарь', 'uborochnyy-inventar'),
  ('medikal-saglik', 'tr', 'Medikal ve Sağlık', 'medikal-saglik'),
  ('medikal-saglik', 'en', 'Medical and Healthcare', 'medical-healthcare'),
  ('medikal-saglik', 'ru', 'Медицина и здоровье', 'meditsina-zdorove'),
  ('tibbi-sarf', 'tr', 'Tıbbi Sarf Malzeme', 'tibbi-sarf'),
  ('tibbi-sarf', 'en', 'Medical Consumables', 'medical-consumables'),
  ('tibbi-sarf', 'ru', 'Медицинские расходники', 'meditsinskie-raskhodniki'),
  ('tibbi-cihaz', 'tr', 'Tıbbi Cihaz', 'tibbi-cihaz'),
  ('tibbi-cihaz', 'en', 'Medical Devices', 'medical-devices'),
  ('tibbi-cihaz', 'ru', 'Медицинское оборудование', 'meditsinskoe-oborudovanie'),
  ('kisisel-koruyucu-donanim', 'tr', 'Kişisel Koruyucu Donanım', 'kisisel-koruyucu-donanim'),
  ('kisisel-koruyucu-donanim', 'en', 'PPE', 'ppe'),
  ('kisisel-koruyucu-donanim', 'ru', 'СИЗ', 'siz'),
  ('laboratuvar-ekipmani', 'tr', 'Laboratuvar Ekipmanı', 'laboratuvar-ekipmani'),
  ('laboratuvar-ekipmani', 'en', 'Laboratory Equipment', 'laboratory-equipment'),
  ('laboratuvar-ekipmani', 'ru', 'Лабораторное оборудование', 'laboratornoe-oborudovanie'),
  ('ilac-takviye', 'tr', 'İlaç ve Takviye', 'ilac-takviye'),
  ('ilac-takviye', 'en', 'Pharma and Supplements', 'pharma-supplements'),
  ('ilac-takviye', 'ru', 'Фармацевтика и добавки', 'farmatsevtika-dobavki'),
  ('ortopedi-rehabilitasyon', 'tr', 'Ortopedi ve Rehabilitasyon', 'ortopedi-rehabilitasyon'),
  ('ortopedi-rehabilitasyon', 'en', 'Orthopaedics', 'orthopaedics'),
  ('ortopedi-rehabilitasyon', 'ru', 'Ортопедия', 'ortopediya'),
  ('tarim-hayvancilik', 'tr', 'Tarım ve Hayvancılık', 'tarim-hayvancilik'),
  ('tarim-hayvancilik', 'en', 'Agriculture and Livestock', 'agriculture-livestock'),
  ('tarim-hayvancilik', 'ru', 'Сельское хозяйство', 'selskoe-khozyaystvo'),
  ('tohum-fide', 'tr', 'Tohum ve Fide', 'tohum-fide'),
  ('tohum-fide', 'en', 'Seeds and Seedlings', 'seeds-seedlings'),
  ('tohum-fide', 'ru', 'Семена и рассада', 'semena-rassada'),
  ('sera-ekipman', 'tr', 'Sera ve Ekipman', 'sera-ekipman'),
  ('sera-ekipman', 'en', 'Greenhouse Equipment', 'greenhouse-equipment'),
  ('sera-ekipman', 'ru', 'Тепличное оборудование', 'teplichnoe-oborudovanie'),
  ('sulama-sistemleri', 'tr', 'Sulama Sistemleri', 'sulama-sistemleri'),
  ('sulama-sistemleri', 'en', 'Irrigation', 'irrigation'),
  ('sulama-sistemleri', 'ru', 'Орошение', 'orosheniye'),
  ('yem-hayvan-besleme', 'tr', 'Yem ve Hayvan Besleme', 'yem-hayvan-besleme'),
  ('yem-hayvan-besleme', 'en', 'Feed and Nutrition', 'feed-nutrition'),
  ('yem-hayvan-besleme', 'ru', 'Корма', 'korma'),
  ('hayvancilik-ekipmani', 'tr', 'Hayvancılık Ekipmanı', 'hayvancilik-ekipmani'),
  ('hayvancilik-ekipmani', 'en', 'Livestock Equipment', 'livestock-equipment'),
  ('hayvancilik-ekipmani', 'ru', 'Животноводческое оборудование', 'zhivotnovodcheskoe-oborudovanie'),
  ('su-urunleri-yetistiriciligi', 'tr', 'Su Ürünleri Yetiştiriciliği', 'su-urunleri-yetistiriciligi'),
  ('su-urunleri-yetistiriciligi', 'en', 'Aquaculture', 'aquaculture'),
  ('su-urunleri-yetistiriciligi', 'ru', 'Аквакультура', 'akvakultura'),
  ('hirdavat', 'tr', 'Hırdavat ve El Aletleri', 'hirdavat-el-aletleri'),
  ('hirdavat', 'en', 'Hardware and Tools', 'hardware-tools'),
  ('hirdavat', 'ru', 'Скобяные изделия и инструмент', 'skobyanye-instrument'),
  ('el-aletleri', 'tr', 'El Aletleri', 'el-aletleri'),
  ('el-aletleri', 'en', 'Hand Tools', 'hand-tools'),
  ('el-aletleri', 'ru', 'Ручной инструмент', 'ruchnoy-instrument'),
  ('elektrikli-el-aleti', 'tr', 'Elektrikli El Aleti', 'elektrikli-el-aleti'),
  ('elektrikli-el-aleti', 'en', 'Power Tools', 'power-tools'),
  ('elektrikli-el-aleti', 'ru', 'Электроинструмент', 'elektroinstrument'),
  ('baglanti-elemanlari', 'tr', 'Bağlantı Elemanları', 'baglanti-elemanlari'),
  ('baglanti-elemanlari', 'en', 'Fasteners', 'fasteners'),
  ('baglanti-elemanlari', 'ru', 'Крепёж', 'krepezh'),
  ('kesici-takim', 'tr', 'Kesici Takım', 'kesici-takim'),
  ('kesici-takim', 'en', 'Cutting Tools', 'cutting-tools'),
  ('kesici-takim', 'ru', 'Режущий инструмент', 'rezhushchiy-instrument'),
  ('kilit-mentese', 'tr', 'Kilit ve Menteşe', 'kilit-mentese'),
  ('kilit-mentese', 'en', 'Locks and Hinges', 'locks-hinges'),
  ('kilit-mentese', 'ru', 'Замки и петли', 'zamki-petli'),
  ('is-guvenligi-ekipmani', 'tr', 'İş Güvenliği Ekipmanı', 'is-guvenligi-ekipmani'),
  ('is-guvenligi-ekipmani', 'en', 'Safety Equipment', 'safety-equipment'),
  ('is-guvenligi-ekipmani', 'ru', 'Средства безопасности', 'sredstva-bezopasnosti'),
  ('kirtasiye', 'tr', 'Kırtasiye ve Ofis', 'kirtasiye-ofis'),
  ('kirtasiye', 'en', 'Stationery and Office', 'stationery-office'),
  ('kirtasiye', 'ru', 'Канцтовары и офис', 'kanctovary-ofis'),
  ('kagit-defter', 'tr', 'Kâğıt ve Defter', 'kagit-defter'),
  ('kagit-defter', 'en', 'Paper and Notebooks', 'paper-notebooks'),
  ('kagit-defter', 'ru', 'Бумага и тетради', 'bumaga-tetradi'),
  ('yazi-gerecleri', 'tr', 'Yazı Gereçleri', 'yazi-gerecleri'),
  ('yazi-gerecleri', 'en', 'Writing Instruments', 'writing-instruments'),
  ('yazi-gerecleri', 'ru', 'Письменные принадлежности', 'pismennye-prinadlezhnosti'),
  ('ofis-sarf', 'tr', 'Ofis Sarf Malzemesi', 'ofis-sarf'),
  ('ofis-sarf', 'en', 'Office Supplies', 'office-supplies'),
  ('ofis-sarf', 'ru', 'Офисные расходники', 'ofisnye-raskhodniki'),
  ('baski-toner', 'tr', 'Baskı ve Toner', 'baski-toner'),
  ('baski-toner', 'en', 'Printing and Toner', 'printing-toner'),
  ('baski-toner', 'ru', 'Печать и тонеры', 'pechat-tonery'),
  ('promosyon-urunleri', 'tr', 'Promosyon Ürünleri', 'promosyon-urunleri'),
  ('promosyon-urunleri', 'en', 'Promotional Products', 'promotional-products'),
  ('promosyon-urunleri', 'ru', 'Промо-продукция', 'promo-produktsiya'),
  ('oyuncak-hobi-spor', 'tr', 'Oyuncak, Hobi ve Spor', 'oyuncak-hobi-spor'),
  ('oyuncak-hobi-spor', 'en', 'Toys, Hobby and Sports', 'toys-hobby-sports'),
  ('oyuncak-hobi-spor', 'ru', 'Игрушки, хобби и спорт', 'igrushki-khobbi-sport'),
  ('oyuncak', 'tr', 'Oyuncak', 'oyuncak'),
  ('oyuncak', 'en', 'Toys', 'toys'),
  ('oyuncak', 'ru', 'Игрушки', 'igrushki'),
  ('spor-malzemesi', 'tr', 'Spor Malzemesi', 'spor-malzemesi'),
  ('spor-malzemesi', 'en', 'Sporting Goods', 'sporting-goods'),
  ('spor-malzemesi', 'ru', 'Спорттовары', 'sporttovary'),
  ('kamp-outdoor', 'tr', 'Kamp ve Outdoor', 'kamp-outdoor'),
  ('kamp-outdoor', 'en', 'Camping and Outdoor', 'camping-outdoor'),
  ('kamp-outdoor', 'ru', 'Кемпинг и туризм', 'kemping-turizm'),
  ('hobi-el-sanatlari', 'tr', 'Hobi ve El Sanatları', 'hobi-el-sanatlari'),
  ('hobi-el-sanatlari', 'en', 'Hobby and Crafts', 'hobby-crafts'),
  ('hobi-el-sanatlari', 'ru', 'Хобби и рукоделие', 'khobbi-rukodelie'),
  ('parti-hediyelik', 'tr', 'Parti ve Hediyelik', 'parti-hediyelik'),
  ('parti-hediyelik', 'en', 'Party and Gifts', 'party-gifts'),
  ('parti-hediyelik', 'ru', 'Праздник и подарки', 'prazdnik-podarki'),
  ('lojistik-depolama', 'tr', 'Lojistik ve Depolama', 'lojistik-depolama'),
  ('lojistik-depolama', 'en', 'Logistics and Storage', 'logistics-storage'),
  ('lojistik-depolama', 'ru', 'Логистика и склад', 'logistika-sklad'),
  ('raf-depo-sistemleri', 'tr', 'Raf ve Depo Sistemleri', 'raf-depo-sistemleri'),
  ('raf-depo-sistemleri', 'en', 'Racking and Shelving', 'racking-shelving'),
  ('raf-depo-sistemleri', 'ru', 'Стеллажи', 'stellazhi'),
  ('istif-tasima-ekipmani', 'tr', 'İstif ve Taşıma Ekipmanı', 'istif-tasima-ekipmani'),
  ('istif-tasima-ekipmani', 'en', 'Material Handling', 'material-handling'),
  ('istif-tasima-ekipmani', 'ru', 'Погрузочная техника', 'pogruzochnaya-tekhnika'),
  ('soguk-zincir-ekipmani', 'tr', 'Soğuk Zincir Ekipmanı', 'soguk-zincir-ekipmani'),
  ('soguk-zincir-ekipmani', 'en', 'Cold Chain Equipment', 'cold-chain-equipment'),
  ('soguk-zincir-ekipmani', 'ru', 'Холодильное оборудование', 'kholodilnoe-oborudovanie'),
  ('konteyner-tasima-kabi', 'tr', 'Konteyner ve Taşıma Kabı', 'konteyner-tasima-kabi'),
  ('konteyner-tasima-kabi', 'en', 'Containers and Bins', 'containers-bins'),
  ('konteyner-tasima-kabi', 'ru', 'Контейнеры', 'konteynery')
) as v(base_slug, locale, name, slug)
join categories c on c.slug = v.base_slug
on conflict (category_id, locale) do update set
  name = excluded.name,
  slug = excluded.slug;


-- ============ 20260901240000_business_kinds.sql ============
-- ============================================================
-- İş tipi taksonomisi ve tipe özel alanlar
--
-- company_kind yalnızca 'manufacturer / trader / both' idi. Bu ayrım
-- sahadaki gerçeği karşılamıyor: toptancı ile üreticinin ne sattığı da,
-- ne aradığı da, panelde neye baktığı da farklı. Perakendeci küçük
-- parti ve hızlı sevkiyat ararken üretici kapasite doldurmaya çalışır.
--
-- Beş tip, her biri hem satış hem alım tarafında farklı davranır:
--   manufacturer  Üretici / fabrika      — üretir, kapasite satar
--   wholesaler    Toptancı / distribütör — alır ve toptan satar
--   retailer      Perakendeci            — satmak için alır
--   trader        Dış ticaret            — ihracat/ithalat aracısı
--   corporate     Kurumsal alıcı         — zincir, otel, kamu; ihaleyle alır
-- ============================================================

-- ---------- 1. Taksonomi ----------
-- Eski 'both' değeri "hem üretir hem satar" demekti; üretici olarak
-- devredilir, üretim yapan firma önce üreticidir.
update companies set company_kind = 'manufacturer' where company_kind = 'both';

alter table companies drop constraint if exists companies_company_kind_check;
alter table companies
  add constraint companies_company_kind_check check (
    company_kind is null or company_kind in (
      'manufacturer', 'wholesaler', 'retailer', 'trader', 'corporate'
    )
  );

comment on column companies.company_kind is
  'İş tipi. Kayıt akışını, paneli ve profil alanlarını belirler.';

-- ---------- 2. Tipe özel alanlar ----------
-- Yalnızca arayüzde GÖSTERİLEN veya filtrelenen alanlar eklenir; boş
-- kalacak kolon yığmak profili "eksik" gösterir ve kimse doldurmaz.

-- Üretici
alter table companies
  add column if not exists oem_available boolean not null default false,
  add column if not exists odm_available boolean not null default false,
  add column if not exists production_lines smallint
    check (production_lines is null or production_lines > 0);

-- Toptancı / distribütör
alter table companies
  add column if not exists brands_carried text[],
  add column if not exists warehouse_count smallint
    check (warehouse_count is null or warehouse_count > 0),
  add column if not exists coverage_note text;

-- Perakendeci
alter table companies
  add column if not exists store_count smallint
    check (store_count is null or store_count >= 0),
  add column if not exists sales_channels text[];

-- Dış ticaret
alter table companies
  add column if not exists import_countries text[],
  add column if not exists foreign_trade_certificate boolean not null default false;

-- Kurumsal alıcı
alter table companies
  add column if not exists branch_count smallint
    check (branch_count is null or branch_count >= 0),
  add column if not exists procurement_method text
    check (procurement_method is null or procurement_method in (
      'direct', 'tender', 'framework'
    )),
  add column if not exists standard_payment_days smallint
    check (standard_payment_days is null
           or standard_payment_days between 0 and 365);

create index if not exists companies_kind_idx on companies (company_kind)
  where status = 'approved';

-- ============================================================
-- 3. NİŞ MODÜL: Fazla stok
--
-- Türkiye'de her toptancı ve üreticinin deposunda ölü stok var: sezonu
-- geçmiş, sipariş iptali kalmış, renk tutmamış partiler. Bunlar normal
-- katalogda kaybolur çünkü alıcı "indirimli parti" diye aramaz.
-- Ayrı bir görünürlük katmanı, satıcıya nakit, alıcıya fiyat sağlar.
-- ============================================================
alter table products
  add column if not exists clearance boolean not null default false,
  add column if not exists clearance_until date,
  add column if not exists clearance_reason text;

comment on column products.clearance is
  'Fazla/ölü stok ilanı. Ayrı listede öne çıkar, süresi dolunca düşer.';

create index if not exists products_clearance_idx
  on products (clearance_until)
  where clearance = true and status = 'active';

-- ============================================================
-- 4. NİŞ MODÜL: Boş üretim kapasitesi (fason)
--
-- Fabrikanın boş vardiyası bugün telefonla, tanıdık üzerinden satılır.
-- Ürün ilanı değildir — satılan şey ZAMAN ve HAT. Bu yüzden products'a
-- sıkıştırılamaz: ne stok vardır ne fiyat kademesi; süre ve süreç vardır.
-- ============================================================
create table if not exists capacity_offers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  title text not null,
  -- Süreç adı serbest: "konfeksiyon dikim", "plastik enjeksiyon",
  -- "CNC talaşlı imalat". Sektöre göre değişir, kısıtlanamaz.
  process text not null,
  description text,
  available_from date not null,
  available_to date not null,
  /* Aylık kapasite; alıcının "işim sığar mı" sorusunun tek cevabı. */
  monthly_units integer check (monthly_units is null or monthly_units > 0),
  unit text,
  min_batch integer check (min_batch is null or min_batch > 0),
  city text,
  status text not null default 'open'
    check (status in ('open', 'reserved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (available_to >= available_from)
);

alter table capacity_offers enable row level security;

create index if not exists capacity_offers_open_idx
  on capacity_offers (available_from) where status = 'open';
create index if not exists capacity_offers_company_idx
  on capacity_offers (company_id);

drop policy if exists "capacity_offers_select_public" on capacity_offers;
create policy "capacity_offers_select_public" on capacity_offers
  for select using (
    status = 'open'
    or company_id in (
      select c.id from companies c where c.owner_id = (select auth.uid())
    )
    or public.is_admin()
  );

drop policy if exists "capacity_offers_write_own" on capacity_offers;
create policy "capacity_offers_write_own" on capacity_offers
  for all using (
    public.is_admin()
    or company_id in (
      select c.id from companies c where c.owner_id = (select auth.uid())
    )
  )
  with check (
    public.is_admin()
    or company_id in (
      select c.id from companies c where c.owner_id = (select auth.uid())
    )
  );

drop trigger if exists capacity_offers_touch on capacity_offers;
create trigger capacity_offers_touch
  before update on capacity_offers
  for each row execute function public.touch_updated_at();

-- ============================================================
-- 5. NİŞ MODÜL: Düzenli sipariş şablonu
--
-- Perakendeci her ay büyük ölçüde AYNI listeyi alır. Bu listeyi her
-- seferinde yeniden kurmak, platformu terk edip tedarikçiyi doğrudan
-- aramanın en yaygın sebebi. Şablon, tekrar eden alımı platformda tutar.
-- ============================================================
create table if not exists order_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  note text,
  /* Hatırlatma aralığı; boşsa hatırlatma yapılmaz. */
  repeat_days smallint check (repeat_days is null or repeat_days between 1 and 365),
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists order_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references order_templates(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  unique (template_id, product_id)
);

alter table order_templates enable row level security;
alter table order_template_items enable row level security;

create index if not exists order_templates_owner_idx
  on order_templates (owner_id);
create index if not exists order_template_items_template_idx
  on order_template_items (template_id);

-- Şablon tamamen özeldir: ne aldığınız rakibinize gösterilmez.
drop policy if exists "order_templates_own" on order_templates;
create policy "order_templates_own" on order_templates
  for all using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "order_template_items_own" on order_template_items;
create policy "order_template_items_own" on order_template_items
  for all using (
    exists (
      select 1 from order_templates t
      where t.id = template_id and t.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from order_templates t
      where t.id = template_id and t.owner_id = (select auth.uid())
    )
  );


-- ============ kurulum sonrası yetkiler ============
grant all on all tables in schema public
  to postgres, anon, authenticated, service_role;
grant all on all functions in schema public
  to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public
  to postgres, anon, authenticated, service_role;
