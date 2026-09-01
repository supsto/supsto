-- ============================================================
-- Yorum/puan ve moderasyon
--   1. Değerlendirmeler — YALNIZCA tamamlanmış siparişe dayanır
--   2. Firma puan özeti (denormalize, tetikleyiciyle güncel)
--   3. Raporlama / moderasyon
-- ============================================================

-- ============================================================
-- 1. DEĞERLENDİRMELER
--
-- B2B'de itibarın değerli olması için doğrulanabilir olması gerekir.
-- Bu yüzden yorum serbestçe yazılamaz: yalnızca TAMAMLANMIŞ bir
-- siparişin alıcısı, o sipariş için tek yorum bırakabilir.
-- ============================================================

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  -- Sipariş başına tek yorum: aynı işlemden itibar üretilemesin.
  order_id uuid not null unique references orders(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  -- Alt kırılımlar: B2B'de "5 yıldız" tek başına bilgi vermez.
  quality_rating smallint check (quality_rating between 1 and 5),
  delivery_rating smallint check (delivery_rating between 1 and 5),
  communication_rating smallint check (communication_rating between 1 and 5),
  comment text check (comment is null or length(btrim(comment)) >= 10),
  reply text,
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table reviews enable row level security;

drop trigger if exists reviews_touch on reviews;
create trigger reviews_touch before update on reviews
  for each row execute function public.touch_updated_at();

/*
  Yorumun gerçekten tamamlanmış bir işleme dayandığını veritabanı
  garanti eder. RLS'e bırakılsaydı politika ifadesi çok karmaşıklaşırdı;
  tetikleyici hem daha okunur hem de daha net hata verir.
*/
create or replace function public.enforce_review_integrity()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  o record;
begin
  select * into o from public.orders where id = new.order_id;

  if o is null then
    raise exception 'Sipariş bulunamadı' using errcode = 'foreign_key_violation';
  end if;
  if o.status <> 'completed' then
    raise exception 'Yalnızca tamamlanmış sipariş değerlendirilebilir'
      using errcode = 'check_violation';
  end if;
  if not public.is_service_context() and o.buyer_id <> auth.uid() then
    raise exception 'Yalnızca siparişin alıcısı değerlendirebilir'
      using errcode = 'insufficient_privilege';
  end if;

  -- Yorumun hedefi siparişten türetilir; istemci gönderse bile yok sayılır.
  new.company_id := o.company_id;
  new.author_id  := o.buyer_id;
  return new;
end;
$$;

drop trigger if exists reviews_enforce_integrity on reviews;
create trigger reviews_enforce_integrity
  before insert on reviews
  for each row execute function public.enforce_review_integrity();

-- Yanıtı yalnızca tedarikçi yazabilir, puana dokunamaz.
create or replace function public.protect_review_columns()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  is_supplier boolean;
begin
  if public.is_admin() or public.is_service_context() then
    return new;
  end if;

  select exists (
    select 1 from public.companies c
    where c.id = old.company_id and c.owner_id = auth.uid()
  ) into is_supplier;

  if is_supplier then
    -- Tedarikçi yalnızca yanıt ekler.
    new.rating               := old.rating;
    new.quality_rating       := old.quality_rating;
    new.delivery_rating      := old.delivery_rating;
    new.communication_rating := old.communication_rating;
    new.comment              := old.comment;
    if new.reply is distinct from old.reply then
      new.replied_at := now();
    end if;
  else
    -- Alıcı yanıta dokunamaz.
    new.reply      := old.reply;
    new.replied_at := old.replied_at;
  end if;

  new.order_id   := old.order_id;
  new.company_id := old.company_id;
  new.author_id  := old.author_id;
  return new;
end;
$$;

drop trigger if exists reviews_protect on reviews;
create trigger reviews_protect before update on reviews
  for each row execute function public.protect_review_columns();

-- ============================================================
-- 2. FİRMA PUAN ÖZETİ
--
-- Liste sayfalarında her firma için ortalama hesaplamak pahalı;
-- denormalize edip tetikleyiciyle güncel tutuyoruz.
-- ============================================================

alter table companies
  add column if not exists rating_average numeric(3,2)
    check (rating_average is null or rating_average between 1 and 5),
  add column if not exists rating_count integer not null default 0
    check (rating_count >= 0);

create or replace function public.sync_company_rating()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  cid uuid := coalesce(new.company_id, old.company_id);
begin
  update public.companies c
     set rating_average = sub.avg_rating,
         rating_count   = sub.n
    from (
      select round(avg(rating)::numeric, 2) as avg_rating, count(*) as n
        from public.reviews where company_id = cid
    ) sub
   where c.id = cid;
  return null;
end;
$$;

drop trigger if exists reviews_sync_rating on reviews;
create trigger reviews_sync_rating
  after insert or update or delete on reviews
  for each row execute function public.sync_company_rating();

-- ============================================================
-- 3. RAPORLAMA / MODERASYON
-- ============================================================

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  -- Tam olarak bir hedef
  product_id uuid references products(id) on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  rfq_id uuid references rfqs(id) on delete cascade,
  review_id uuid references reviews(id) on delete cascade,
  reason text not null check (reason in
    ('spam', 'counterfeit', 'misleading', 'offensive', 'wrong_category', 'other')),
  detail text,
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  resolution_note text,
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint reports_single_target check (
    (product_id is not null)::int + (company_id is not null)::int
    + (rfq_id is not null)::int + (review_id is not null)::int = 1
  )
);

alter table reports enable row level security;

-- Aynı kişi aynı hedefi tekrar tekrar raporlayıp kuyruğu şişiremesin.
create unique index if not exists reports_unique_product
  on reports (reporter_id, product_id) where product_id is not null;
create unique index if not exists reports_unique_company
  on reports (reporter_id, company_id) where company_id is not null;
create unique index if not exists reports_unique_rfq
  on reports (reporter_id, rfq_id) where rfq_id is not null;
create unique index if not exists reports_unique_review
  on reports (reporter_id, review_id) where review_id is not null;

-- ============================================================
-- 4. RLS
-- ============================================================

-- Değerlendirmeler herkese açık okunur: alıcı karar verirken görmeli.
create policy "reviews_select_all" on reviews for select using (true);

create policy "reviews_insert_buyer" on reviews
  for insert with check (
    exists (
      select 1 from orders o
      where o.id = order_id
        and o.buyer_id = (select auth.uid())
        and o.status = 'completed'
    )
  );

create policy "reviews_update_parties" on reviews
  for update using (
    public.is_admin()
    or author_id = (select auth.uid())
    or exists (select 1 from companies c where c.id = company_id and c.owner_id = (select auth.uid()))
  )
  with check (
    public.is_admin()
    or author_id = (select auth.uid())
    or exists (select 1 from companies c where c.id = company_id and c.owner_id = (select auth.uid()))
  );

create policy "reviews_delete_admin" on reviews
  for delete using (public.is_admin());

-- Raporu yalnızca sahibi ve admin görür; suçlanan taraf göremez.
create policy "reports_select_own_or_admin" on reports
  for select using (reporter_id = (select auth.uid()) or public.is_admin());

create policy "reports_insert_own" on reports
  for insert with check (reporter_id = (select auth.uid()));

create policy "reports_update_admin" on reports
  for update using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 5. INDEKSLER + BİLDİRİM
-- ============================================================

create index if not exists reviews_company_idx on reviews (company_id, created_at desc);
create index if not exists reports_status_idx on reports (status, created_at desc);

-- Yeni değerlendirme → tedarikçiye
create or replace function public.notify_new_review()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
declare owner uuid;
begin
  select c.owner_id into owner from public.companies c where c.id = new.company_id;
  if owner is not null then
    perform public.notify(owner, 'review.received', 'Yeni değerlendirme aldınız',
      new.rating || '/5', '/dashboard/company');
  end if;
  return null;
end $$;

drop trigger if exists reviews_notify on reviews;
create trigger reviews_notify after insert on reviews
  for each row execute function public.notify_new_review();
