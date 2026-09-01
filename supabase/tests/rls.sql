\set ON_ERROR_STOP on
\pset pager off

-- ---- Test verisi (postgres rolüyle, RLS baypas) ----
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                        created_at, updated_at)
values
 ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','buyer@test.local','x',now(),'{}','{"full_name":"Test Alıcı"}',now(),now()),
 ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','supplier@test.local','x',now(),'{}','{"full_name":"Test Tedarikçi"}',now(),now());

insert into companies (id, owner_id, name, slug, city)
values ('33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222','Test Ambalaj','test-ambalaj','İstanbul');

insert into rfqs (id, buyer_id, title, description, quantity, status)
values ('44444444-4444-4444-4444-444444444444','11111111-1111-1111-1111-111111111111','5000 koli','kraft koli',5000,'open');

insert into quotes (id, rfq_id, company_id, price, message)
values ('55555555-5555-5555-5555-555555555555','44444444-4444-4444-4444-444444444444','33333333-3333-3333-3333-333333333333',44.00,'orijinal teklif');

\echo '=== 0. handle_new_user tetikleyicisi profil açtı mı? ==='
select (select count(*) from profiles where id in
        ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222')) = 2
       as "profiller_otomatik_olustu";

\echo ''
\echo '=== 1. Kullanıcı kendini admin yapabilir mi? (BEKLENEN: hayır) ==='
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
  update profiles set role = 'admin' where id = '11111111-1111-1111-1111-111111111111';
commit;
select role = 'buyer' as "rol_yukseltme_engellendi"
  from profiles where id = '11111111-1111-1111-1111-111111111111';

\echo ''
\echo '=== 2. Firma sahibi kendine doğrulama rozeti verebilir mi? (BEKLENEN: hayır) ==='
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
  update companies set verified = true, verified_at = now()
   where id = '33333333-3333-3333-3333-333333333333';
commit;
select verified = false as "sahte_rozet_engellendi"
  from companies where id = '33333333-3333-3333-3333-333333333333';

\echo ''
\echo '=== 3. RFQ sahibi tedarikçinin teklif fiyatını değiştirebilir mi? (BEKLENEN: hayır) ==='
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
  update quotes set price = 1.00, status = 'accepted'
   where id = '55555555-5555-5555-5555-555555555555';
commit;
select price = 44.00 as "fiyat_korundu", status = 'accepted' as "durum_degistirilebildi"
  from quotes where id = '55555555-5555-5555-5555-555555555555';

\echo ''
\echo '=== 4. Tedarikçi kendi teklifini kabul edebilir mi? (BEKLENEN: hayır) ==='
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
  update quotes set status = 'rejected', price = 99.00
   where id = '55555555-5555-5555-5555-555555555555';
commit;
select status = 'accepted' as "durum_kendi_degistiremedi", price = 99.00 as "kendi_fiyatini_degistirebildi"
  from quotes where id = '55555555-5555-5555-5555-555555555555';

\echo ''
\echo '=== 5. Anonim kullanıcı telefon numaralarını okuyabilir mi? (BEKLENEN: hayır) ==='
begin;
  set local role anon;
  set local request.jwt.claims = '{"role":"anon"}';
  select count(*) = 0 as "profiller_anona_kapali" from profiles;
commit;

\echo ''
\echo '=== 6. Anonim kullanıcı aktif firma/açık RFQ görebiliyor mu? (BEKLENEN: evet) ==='
begin;
  set local role anon;
  set local request.jwt.claims = '{"role":"anon"}';
  select (select count(*) from companies) = 1 as "firma_gorunur",
         (select count(*) from rfqs) = 1     as "acik_rfq_gorunur",
         (select count(*) from quotes) = 0   as "teklifler_gizli";
commit;

\echo ''
\echo '=== 7. Başkasının firmasına ürün eklenebilir mi? (BEKLENEN: hayır) ==='
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
  savepoint s;
  insert into products (company_id, title, slug)
  values ('33333333-3333-3333-3333-333333333333','Korsan ürün','korsan-urun');
exception when others then null;
end;
