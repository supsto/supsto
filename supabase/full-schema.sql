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


-- ============ kurulum sonrası yetkiler ============
grant all on all tables in schema public
  to postgres, anon, authenticated, service_role;
grant all on all functions in schema public
  to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public
  to postgres, anon, authenticated, service_role;
