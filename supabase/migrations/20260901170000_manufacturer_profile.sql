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
