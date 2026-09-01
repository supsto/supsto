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
