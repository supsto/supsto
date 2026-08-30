
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