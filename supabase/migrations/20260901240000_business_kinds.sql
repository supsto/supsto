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
