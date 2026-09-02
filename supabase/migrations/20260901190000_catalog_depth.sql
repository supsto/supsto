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
