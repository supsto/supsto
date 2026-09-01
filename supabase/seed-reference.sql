-- ============================================================
-- ÜRETİM referans verisi: kategoriler ve çevirileri.
--
-- Bu veri migration'ların içinde de var; ancak migration bir kez
-- "uygulandı" işaretlendikten sonra tekrar çalışmaz. Bulut projesinde
-- kategoriler boş kaldıysa bu dosyayı Supabase SQL Editor'e yapıştırın
-- ya da:
--     psql "$DATABASE_URL" -f supabase/seed-reference.sql
--
-- Tamamen idempotenttir: tekrar çalıştırmak zararsızdır.
--
-- NOT: supabase/seed.sql DEMO verisidir (sahte kullanıcı/ürün) ve
-- üretime GİTMEMELİDİR. Bu dosya ondan farklıdır.
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

insert into category_translations (category_id, locale, name, slug)
select id, 'tr', name, slug from categories
on conflict (category_id, locale) do nothing;

insert into category_translations (category_id, locale, name, slug)
select c.id, v.locale, v.name, v.slug
from (values
  -- kök kategoriler
  ('ambalaj',          'en', 'Packaging',            'packaging'),
  ('ambalaj',          'ru', 'Упаковка',             'upakovka'),
  ('elektronik',       'en', 'Electronics',          'electronics'),
  ('elektronik',       'ru', 'Электроника',          'elektronika'),
  ('tekstil',          'en', 'Textiles',             'textiles'),
  ('tekstil',          'ru', 'Текстиль',             'tekstil'),
  ('otomotiv',         'en', 'Automotive',           'automotive'),
  ('otomotiv',         'ru', 'Автотовары',           'avtotovary'),
  ('makine',           'en', 'Machinery',            'machinery'),
  ('makine',           'ru', 'Оборудование',         'oborudovanie'),
  ('gida',             'en', 'Food',                 'food'),
  ('gida',             'ru', 'Продукты питания',     'produkty-pitaniya'),
  ('kozmetik',         'en', 'Cosmetics',            'cosmetics'),
  ('kozmetik',         'ru', 'Косметика',            'kosmetika'),
  ('hirdavat',         'en', 'Hardware',             'hardware'),
  ('hirdavat',         'ru', 'Скобяные изделия',     'skobyanye-izdeliya'),
  ('plastik',          'en', 'Plastics',             'plastics'),
  ('plastik',          'ru', 'Пластик',              'plastik'),
  ('kirtasiye',        'en', 'Stationery',           'stationery'),
  ('kirtasiye',        'ru', 'Канцтовары',           'kanctovary'),
  ('kimya',            'en', 'Chemicals',            'chemicals'),
  ('kimya',            'ru', 'Химия',                'himiya'),
  ('yapi',             'en', 'Construction',         'construction'),
  ('yapi',             'ru', 'Стройматериалы',       'stroymaterialy'),
  -- alt kategoriler
  ('karton-kutu',      'en', 'Cardboard Boxes',      'cardboard-boxes'),
  ('karton-kutu',      'ru', 'Картонные коробки',    'kartonnye-korobki'),
  ('plastik-kasa',     'en', 'Plastic Crates',       'plastic-crates'),
  ('plastik-kasa',     'ru', 'Пластиковые ящики',    'plastikovye-yashchiki'),
  ('strec-film',       'en', 'Stretch Film',         'stretch-film'),
  ('strec-film',       'ru', 'Стретч-плёнка',        'stretch-plenka'),
  ('balonlu-naylon',   'en', 'Bubble Wrap',          'bubble-wrap'),
  ('balonlu-naylon',   'ru', 'Воздушно-пузырьковая плёнка', 'puzyrchataya-plenka'),
  ('koli-bandi',       'en', 'Packing Tape',         'packing-tape'),
  ('koli-bandi',       'ru', 'Упаковочная лента',    'upakovochnaya-lenta'),
  ('kablo-konnektor',  'en', 'Cables & Connectors',  'cables-connectors'),
  ('kablo-konnektor',  'ru', 'Кабели и разъёмы',     'kabeli-razemy'),
  ('elektronik-modul', 'en', 'Electronic Modules',   'electronic-modules'),
  ('elektronik-modul', 'ru', 'Электронные модули',   'elektronnye-moduli'),
  ('aydinlatma',       'en', 'Lighting',             'lighting'),
  ('aydinlatma',       'ru', 'Освещение',            'osveshchenie'),
  ('kumas',            'en', 'Fabric',               'fabric'),
  ('kumas',            'ru', 'Ткани',                'tkani'),
  ('iplik',            'en', 'Yarn',                 'yarn'),
  ('iplik',            'ru', 'Пряжа',                'pryazha'),
  ('hazir-giyim',      'en', 'Apparel',              'apparel'),
  ('hazir-giyim',      'ru', 'Готовая одежда',       'gotovaya-odezhda'),
  ('yedek-parca',      'en', 'Spare Parts',          'spare-parts'),
  ('yedek-parca',      'ru', 'Запчасти',             'zapchasti'),
  ('lastik',           'en', 'Tyres',                'tyres'),
  ('lastik',           'ru', 'Шины',                 'shiny'),
  ('cnc-tezgah',       'en', 'CNC Machines',         'cnc-machines'),
  ('cnc-tezgah',       'ru', 'Станки с ЧПУ',         'stanki-chpu'),
  ('konveyor',         'en', 'Conveyors',            'conveyors'),
  ('konveyor',         'ru', 'Конвейеры',            'konveyery'),
  ('kuru-gida',        'en', 'Dry Food',             'dry-food'),
  ('kuru-gida',        'ru', 'Бакалея',              'bakaleya'),
  ('icecek',           'en', 'Beverages',            'beverages'),
  ('icecek',           'ru', 'Напитки',              'napitki')
) as v(tr_slug, locale, name, slug)
join categories c on c.slug = v.tr_slug
on conflict (category_id, locale) do nothing;

-- Sonuç kontrolü
select locale, count(*) as kategori_sayisi
  from category_translations group by locale order by locale;
