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
