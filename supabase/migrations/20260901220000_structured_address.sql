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
