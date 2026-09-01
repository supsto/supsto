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
