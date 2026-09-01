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
