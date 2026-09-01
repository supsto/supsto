-- ============================================================
-- Kategori çevirileri
--
-- Kategoriler kontrollü ve küçük bir söz varlığıdır (29 satır), bu yüzden
-- gerçekten çevrilebilirler. Asıl SEO kazancı DİLE ÖZEL SLUG'tır:
-- /en/category/packaging İngilizce aramada sıralanır, /en/category/ambalaj
-- sıralanmaz.
--
-- Ürün ve firma içeriği kaynak dilinde kalır (bkz. content_language).
-- ============================================================

create table if not exists category_translations (
  category_id uuid not null references categories(id) on delete cascade,
  locale text not null check (locale in ('tr', 'en', 'ru')),
  name text not null,
  slug text not null,
  description text,
  created_at timestamptz not null default now(),
  primary key (category_id, locale),
  -- Aynı dilde iki kategori aynı slug'ı alamaz; URL çakışması olmaz.
  unique (locale, slug)
);

alter table category_translations enable row level security;

create policy "category_translations_select_all" on category_translations
  for select using (true);

create policy "category_translations_write_admin" on category_translations
  for all using (public.is_admin()) with check (public.is_admin());

create index if not exists category_translations_lookup_idx
  on category_translations (locale, slug);

-- ---- Türkçe: mevcut kategorilerden türet (kaynak dil) ----
insert into category_translations (category_id, locale, name, slug)
select id, 'tr', name, slug from categories
on conflict (category_id, locale) do nothing;

-- ---- İngilizce ve Rusça ----
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

-- ============================================================
-- İçerik dili
--
-- Ürün ve firma metinlerini tedarikçi kendi dilinde yazar. Hangi dilde
-- yazıldığını saklamak, arayüzde "bu ilan Türkçe yayınlandı" uyarısı
-- göstermeyi ve ileride makine çevirisi eklemeyi mümkün kılar.
-- ============================================================

alter table products
  add column if not exists content_language text not null default 'tr'
    check (content_language in ('tr', 'en', 'ru'));

alter table companies
  add column if not exists content_language text not null default 'tr'
    check (content_language in ('tr', 'en', 'ru'));

alter table rfqs
  add column if not exists content_language text not null default 'tr'
    check (content_language in ('tr', 'en', 'ru'));
