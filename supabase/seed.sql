-- ============================================================
-- Geliştirme verisi. `supabase db reset` sonrası otomatik uygulanır.
-- Üretime gitmez.
-- Tüm demo hesapların parolası: supsto123
-- ============================================================

-- ---- Kullanıcılar ----
with demo(id, email, full_name, role, phone) as (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'admin@supsto.local',   'Mehmet Kaya',    'admin',    '+905000000001'),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'alici@supsto.local',   'Ahmet Yılmaz',   'buyer',    '+905000000002'),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 'nova@supsto.local',    'Selin Aksoy',    'supplier', '+905000000003'),
  ('a0000000-0000-4000-8000-000000000004'::uuid, 'voltrix@supsto.local', 'Can Yıldız',     'supplier', '+905000000004'),
  ('a0000000-0000-4000-8000-000000000005'::uuid, 'mavera@supsto.local',  'Ayşe Demir',     'supplier', '+905000000005'),
  ('a0000000-0000-4000-8000-000000000006'::uuid, 'polybox@supsto.local', 'Burak Şahin',    'supplier', '+905000000006')
),
ins_users as (
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    -- GoTrue bu kolonları Go'da `string` olarak okur; NULL bırakılırsa
    -- girişte "converting NULL to string is unsupported" hatası verir.
    confirmation_token, recovery_token, email_change_token_new,
    email_change_token_current, email_change, phone_change, phone_change_token,
    reauthentication_token
  )
  select d.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         d.email, extensions.crypt('supsto123', extensions.gen_salt('bf')), now(),
         jsonb_build_object('provider', 'email', 'providers', array['email']),
         jsonb_build_object('full_name', d.full_name, 'phone', d.phone, 'role', d.role),
         now(), now(),
         '', '', '', '', '', '', '', ''
  from demo d
  on conflict (id) do nothing
  returning id, email
)
insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id::text, u.id,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from ins_users u
on conflict (provider_id, provider) do nothing;

-- handle_new_user tetikleyicisi profilleri açtı; rolleri metadata'dan sabitle.
update profiles p
   set role = u.raw_user_meta_data ->> 'role',
       full_name = u.raw_user_meta_data ->> 'full_name',
       phone = u.raw_user_meta_data ->> 'phone'
  from auth.users u
 where u.id = p.id
   and u.email like '%@supsto.local';

-- ---- Firmalar ----
insert into companies (
  id, owner_id, name, slug, description, city, district, type, phone, whatsapp,
  website, verified, verified_at, verified_by, response_rate, avg_response_hours
) values
 ('c0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000003',
  'NOVA KUTU Ambalaj San. Tic. Ltd. Şti.','nova-kutu',
  'Oluklu mukavva ve özel ölçü karton kutu üretimi. 1998''den beri toptan ambalaj tedariki.',
  'İstanbul','Bayrampaşa','supplier','+902121234567','+905000000003','https://novakutu.example',
  true, now() - interval '4 months', 'a0000000-0000-4000-8000-000000000001', 96, 2.0),

 ('c0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000004',
  'VOLTRIX Elektronik A.Ş.','voltrix',
  'Endüstriyel elektronik modül, kablo ve konnektör tedariki.',
  'Ankara','Ostim','supplier','+903121234567','+905000000004','https://voltrix.example',
  true, now() - interval '2 months', 'a0000000-0000-4000-8000-000000000001', 91, 3.5),

 ('c0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000005',
  'MAVERA TEXTILE Ltd. Şti.','mavera-textile',
  'Pamuklu ve karışım kumaş rulo üretimi, toplu tekstil tedariki.',
  'Bursa','Nilüfer','supplier','+902241234567','+905000000005',null,
  true, now() - interval '7 months', 'a0000000-0000-4000-8000-000000000001', 88, 5.0),

 ('c0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000006',
  'POLYBOX Lojistik Plastik A.Ş.','polybox',
  'Plastik kasa, palet ve lojistik taşıma ekipmanları.',
  'İzmir','Bornova','supplier','+902321234567','+905000000006','https://polybox.example',
  false, null, null, 74, 8.0)
on conflict (id) do nothing;

-- ---- Ürünler ----
insert into products (
  id, company_id, category_id, title, slug, description, brand, price, moq, unit,
  stock_quantity, images, status, attributes
)
select v.id::uuid, v.company_id::uuid, c.id, v.title, v.slug, v.description, v.brand,
       v.price::numeric, v.moq::int, v.unit, v.stock::int,
       string_to_array(v.image, ','), 'active', v.attrs::jsonb
from (values
 ('d0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','karton-kutu',
  'Karton Kutu 40x60x40 cm','karton-kutu-40x60x40',
  'Yüksek kaliteli çift oluklu mukavva karton kutu. Baskısız veya tek renk baskılı üretilebilir.',
  'NOVA', 55.00, 100, 'adet', 10000, '/assets/cardboard.svg',
  '{"Malzeme":"Çift oluklu mukavva","Ölçü":"40 × 60 × 40 cm","Baskı":"Opsiyonel"}'),

 ('d0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000001','koli-bandi',
  'Şeffaf Koli Bandı 45mm x 100m','koli-bandi-45x100',
  'Akrilik esaslı, yüksek yapışma mukavemetli şeffaf koli bandı.',
  'NOVA', 18.50, 500, 'adet', 24000, '/assets/cardboard.svg',
  '{"Genişlik":"45 mm","Uzunluk":"100 m","Kalınlık":"40 mikron"}'),

 ('d0000000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000002','elektronik-modul',
  'Endüstriyel Elektronik Modül','endustriyel-elektronik-modul',
  '24V endüstriyel kontrol modülü, DIN ray montajlı.',
  'VOLTRIX', 1250.00, 25, 'adet', 2300, '/assets/electronics.svg',
  '{"Besleme":"24V DC","Montaj":"DIN ray","Koruma":"IP20"}'),

 ('d0000000-0000-4000-8000-000000000004','c0000000-0000-4000-8000-000000000002','kablo-konnektor',
  'Endüstriyel Sinyal Kablosu 4x0.75','sinyal-kablosu-4x075',
  'Ekranlı endüstriyel sinyal kablosu, metre bazında satış.',
  'VOLTRIX', 42.00, 500, 'metre', 18000, '/assets/electronics.svg',
  '{"Kesit":"4 × 0.75 mm²","Ekran":"Var","Sıcaklık":"-20 / +80 °C"}'),

 ('d0000000-0000-4000-8000-000000000005','c0000000-0000-4000-8000-000000000003','kumas',
  'Pamuklu Kumaş Rulo 240gr','pamuklu-kumas-rulo-240gr',
  '%100 pamuk, 240 gr/m² örme kumaş. Rulo bazında toptan satış.',
  'MAVERA', 185.00, 500, 'kg', 6800, '/assets/fabric.svg',
  '{"Kompozisyon":"%100 Pamuk","Gramaj":"240 gr/m²","En":"180 cm"}'),

 ('d0000000-0000-4000-8000-000000000006','c0000000-0000-4000-8000-000000000003','iplik',
  'Ne 30/1 Penye İplik','ne-30-1-penye-iplik',
  'Kompakt penye iplik, örme ve dokuma için uygun.',
  'MAVERA', 132.00, 1000, 'kg', 4200, '/assets/fabric.svg',
  '{"Numara":"Ne 30/1","Tip":"Penye","Büküm":"Z"}'),

 ('d0000000-0000-4000-8000-000000000007','c0000000-0000-4000-8000-000000000004','plastik-kasa',
  'Plastik Kasa 60x40x22','plastik-kasa-60x40x22',
  'Darbeye dayanıklı, istiflenebilir lojistik kasası.',
  'POLYBOX', 48.00, 250, 'adet', 2300, '/assets/plastic-crate.svg',
  '{"Ölçü":"60 × 40 × 22 cm","Malzeme":"HDPE","Taşıma":"25 kg"}'),

 ('d0000000-0000-4000-8000-000000000008','c0000000-0000-4000-8000-000000000004','plastik-kasa',
  'Ağır Yük Plastik Palet 120x100','plastik-palet-120x100',
  'Endüstriyel taşıma paleti, forklift uyumlu.',
  'POLYBOX', 640.00, 20, 'adet', 380, '/assets/plastic-crate.svg',
  '{"Ölçü":"120 × 100 cm","Statik yük":"4000 kg","Dinamik yük":"1200 kg"}'),

 ('d0000000-0000-4000-8000-000000000009','c0000000-0000-4000-8000-000000000001','strec-film',
  'Streç Film 500mm 23 Mikron','strec-film-500-23',
  'Manuel sarım için şeffaf streç film.',
  'NOVA', 96.00, 60, 'rulo', 1450, '/assets/cardboard.svg',
  '{"Genişlik":"500 mm","Kalınlık":"23 mikron","Ağırlık":"2.4 kg"}'),

 ('d0000000-0000-4000-8000-000000000010','c0000000-0000-4000-8000-000000000001','balonlu-naylon',
  'Balonlu Naylon 100cm x 100m','balonlu-naylon-100x100',
  'Kırılabilir ürünler için koruyucu balonlu naylon.',
  'NOVA', 340.00, 10, 'rulo', 130, '/assets/cardboard.svg',
  '{"En":"100 cm","Uzunluk":"100 m","Balon çapı":"10 mm"}')
) as v(id, company_id, cat_slug, title, slug, description, brand, price, moq, unit, stock, image, attrs)
join categories c on c.slug = v.cat_slug
on conflict (id) do nothing;

-- ---- Kademeli fiyatlar ----
insert into price_tiers (product_id, min_quantity, max_quantity, unit_price)
values
 ('d0000000-0000-4000-8000-000000000001',    1,   99, 55.00),
 ('d0000000-0000-4000-8000-000000000001',  100,  499, 50.00),
 ('d0000000-0000-4000-8000-000000000001',  500,  999, 45.00),
 ('d0000000-0000-4000-8000-000000000001', 1000, null, 40.00),
 ('d0000000-0000-4000-8000-000000000003',   25,   99, 1250.00),
 ('d0000000-0000-4000-8000-000000000003',  100,  499, 1180.00),
 ('d0000000-0000-4000-8000-000000000003',  500, null, 1090.00),
 ('d0000000-0000-4000-8000-000000000005',  500,  999, 185.00),
 ('d0000000-0000-4000-8000-000000000005', 1000, 4999, 172.00),
 ('d0000000-0000-4000-8000-000000000005', 5000, null, 164.00),
 ('d0000000-0000-4000-8000-000000000007',  250,  999, 48.00),
 ('d0000000-0000-4000-8000-000000000007', 1000, null, 43.50)
on conflict (product_id, min_quantity) do nothing;

-- ---- RFQ'lar ----
insert into rfqs (id, buyer_id, category_id, title, description, quantity, unit,
                  target_price, city, delivery_days, deadline, status, created_at)
select v.id::uuid, 'a0000000-0000-4000-8000-000000000002', c.id, v.title, v.description,
       v.qty::int, v.unit, v.target::numeric, v.city, v.days::int,
       current_date + (v.deadline_in || ' days')::interval, v.status,
       now() - (v.age_days || ' days')::interval
from (values
 ('e0000000-0000-4000-8000-000000000001','ambalaj','5.000 adet kraft koli arıyorum',
  'Kraft koli; baskısız veya tek renk baskılı olabilir. Dayanıklı dış ambalaj isteniyor. Ölçü 30x40x30 civarı.',
  5000,'adet',45.00,'İstanbul',15,'11','open','2'),
 ('e0000000-0000-4000-8000-000000000002','plastik','10.000 adet plastik kasa',
  'Gıda taşımaya uygun, istiflenebilir plastik kasa. Renk tercihi mavi.',
  10000,'adet',42.00,'Bursa',30,'13','open','4'),
 ('e0000000-0000-4000-8000-000000000003','ambalaj','2.000 adet baskılı koli arıyorum',
  'İki renk flekso baskılı koli. Tasarım dosyası hazır, numune bekliyoruz.',
  2000,'adet',58.00,'Ankara',20,'15','open','6'),
 ('e0000000-0000-4000-8000-000000000004','ambalaj','500 adet büyük boy karton kutu',
  'Beyaz mukavva, 80x60x60 ölçülerinde. Tek seferlik alım.',
  500,'adet',120.00,'İzmir',10,'-2','closed','20')
) as v(id, cat_slug, title, description, qty, unit, target, city, days, deadline_in, status, age_days)
join categories c on c.slug = v.cat_slug
on conflict (id) do nothing;

-- ---- Teklifler ----
insert into quotes (rfq_id, company_id, price, moq, delivery_days, message, status)
values
 ('e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001',44.00,1000,7,
  'Stoktan karşılayabiliriz. Tek renk baskı dahil fiyattır.','pending'),
 ('e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000004',44.50,500,9,
  'Numune gönderebiliriz.','pending'),
 ('e0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000004',43.00,2000,12,
  'Gıda onaylı HDPE. 10.000 adet için üretim planına alınır.','accepted'),
 ('e0000000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000001',56.00,500,14,
  'İki renk flekso baskı dahil. Kalıp bedeli ayrıca faturalanır.','pending')
on conflict (rfq_id, company_id) do nothing;
