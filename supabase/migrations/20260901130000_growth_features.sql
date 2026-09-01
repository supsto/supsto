-- ============================================================
-- Büyüme özellikleri
--   1. Toplu alım havuzu (MOQ birleştirme)
--   2. Fiyat / stok alarmları
--   3. Toplu import işleri
--   4. Ürün görüntülenme istatistiği
--   5. Bildirim tetikleyicileri
--   6. Tedarikçi performans karnesi (beyandan değil, veriden)
-- ============================================================

-- ============================================================
-- 1. TOPLU ALIM HAVUZU
--
-- Küçük perakendeci tek başına MOQ'ya ulaşamaz. Birkaç alıcı aynı ürün
-- için birleşip minimum sipariş miktarını doldurur. Segmentin en büyük
-- tıkanıklığı budur.
-- ============================================================

create table if not exists group_buys (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  initiator_id uuid not null references profiles(id) on delete cascade,
  target_quantity integer not null check (target_quantity > 0),
  -- Havuz dolduğunda geçerli olacak birim fiyat (kademeden türetilir).
  target_unit_price numeric(12,2) check (target_unit_price >= 0),
  currency text not null default 'TRY' references currencies(code),
  deadline date not null,
  status text not null default 'open'
    check (status in ('open', 'reached', 'ordered', 'expired', 'cancelled')),
  -- Katılımcı toplamı; tetikleyiciyle güncel tutulur.
  committed_quantity integer not null default 0 check (committed_quantity >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table group_buys enable row level security;

drop trigger if exists group_buys_touch on group_buys;
create trigger group_buys_touch before update on group_buys
  for each row execute function public.touch_updated_at();

create table if not exists group_buy_participants (
  id uuid primary key default gen_random_uuid(),
  group_buy_id uuid not null references group_buys(id) on delete cascade,
  buyer_id uuid not null references profiles(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (group_buy_id, buyer_id)
);

alter table group_buy_participants enable row level security;

/*
  Taahhüt toplamını ve havuzun durumunu tetikleyici yönetir. İstemciye
  bırakılsaydı yarış koşullarında yanlış toplam yazılabilirdi.
*/
create or replace function public.sync_group_buy_total()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  gid uuid := coalesce(new.group_buy_id, old.group_buy_id);
  total integer;
begin
  select coalesce(sum(quantity), 0) into total
    from public.group_buy_participants where group_buy_id = gid;

  update public.group_buys
     set committed_quantity = total,
         status = case
           when status in ('ordered', 'cancelled', 'expired') then status
           when total >= target_quantity then 'reached'
           else 'open'
         end
   where id = gid;

  return null;
end;
$$;

drop trigger if exists group_buy_participants_sync on group_buy_participants;
create trigger group_buy_participants_sync
  after insert or update or delete on group_buy_participants
  for each row execute function public.sync_group_buy_total();

create policy "group_buys_select_all" on group_buys
  for select using (status <> 'cancelled');

create policy "group_buys_insert_own" on group_buys
  for insert with check (initiator_id = (select auth.uid()));

create policy "group_buys_update_initiator" on group_buys
  for update using (initiator_id = (select auth.uid()) or public.is_admin())
  with check (initiator_id = (select auth.uid()) or public.is_admin());

create policy "group_buy_participants_select_all" on group_buy_participants
  for select using (true);

create policy "group_buy_participants_own" on group_buy_participants
  for all using (buyer_id = (select auth.uid()))
  with check (buyer_id = (select auth.uid()));

-- ============================================================
-- 2. FİYAT / STOK ALARMLARI
-- ============================================================

create table if not exists product_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  kind text not null check (kind in ('price_below', 'back_in_stock')),
  target_price numeric(12,2),
  active boolean not null default true,
  triggered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, product_id, kind)
);

alter table product_alerts enable row level security;

create policy "product_alerts_own" on product_alerts
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ============================================================
-- 3. TOPLU IMPORT İŞLERİ
-- ============================================================

create table if not exists import_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  created_by uuid not null references profiles(id) on delete cascade,
  filename text not null,
  total_rows integer not null default 0,
  ok_rows integer not null default 0,
  failed_rows integer not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  -- Satır bazlı hatalar: [{ row: 12, field: 'moq', message: '...' }]
  errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

alter table import_jobs enable row level security;

create policy "import_jobs_own_company" on import_jobs
  for all using (
    public.is_admin()
    or exists (select 1 from companies c where c.id = company_id and c.owner_id = (select auth.uid()))
  )
  with check (
    public.is_admin()
    or exists (select 1 from companies c where c.id = company_id and c.owner_id = (select auth.uid()))
  );

-- ============================================================
-- 4. ÜRÜN GÖRÜNTÜLENME (tedarikçi analitiği)
--
-- Ham olay yerine günlük toplam: tablo şişmez, tedarikçiye yeten
-- çözünürlük budur.
-- ============================================================

create table if not exists product_view_stats (
  product_id uuid not null references products(id) on delete cascade,
  day date not null default current_date,
  views integer not null default 0,
  primary key (product_id, day)
);

alter table product_view_stats enable row level security;

create policy "product_view_stats_select_owner" on product_view_stats
  for select using (
    public.is_admin()
    or exists (
      select 1 from products p join companies c on c.id = p.company_id
      where p.id = product_id and c.owner_id = (select auth.uid())
    )
  );

/*
  Sayacı RPC üzerinden artırırız: anonim ziyaretçinin tabloya doğrudan
  yazma yetkisi olmamalı, ama görüntülemesi sayılmalı.
*/
create or replace function public.track_product_view(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.product_view_stats (product_id, day, views)
  values (p_product_id, current_date, 1)
  on conflict (product_id, day)
  do update set views = product_view_stats.views + 1;
end;
$$;

revoke execute on function public.track_product_view(uuid) from public;
grant execute on function public.track_product_view(uuid) to anon, authenticated;

-- ============================================================
-- 5. BİLDİRİM TETİKLEYİCİLERİ
--
-- notifications tablosunda INSERT politikası yoktur; kayıtları yalnızca
-- bu SECURITY DEFINER tetikleyiciler üretir.
-- ============================================================

create or replace function public.notify(
  p_user_id uuid, p_type text, p_title text, p_body text, p_url text
) returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.notifications (user_id, type, title, body, url)
  values (p_user_id, p_type, p_title, p_body, p_url);
$$;

-- Yeni teklif → RFQ sahibine
create or replace function public.notify_new_quote()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  buyer uuid; rfq_title text; supplier_name text;
begin
  select r.buyer_id, r.title into buyer, rfq_title from public.rfqs r where r.id = new.rfq_id;
  select c.name into supplier_name from public.companies c where c.id = new.company_id;
  if buyer is not null and buyer <> auth.uid() then
    perform public.notify(buyer, 'quote.received', 'Yeni teklif aldınız',
      coalesce(supplier_name, 'Bir tedarikçi') || ' · ' || coalesce(rfq_title, ''),
      '/rfq/' || new.rfq_id);
  end if;
  return null;
end $$;

drop trigger if exists quotes_notify_new on quotes;
create trigger quotes_notify_new after insert on quotes
  for each row execute function public.notify_new_quote();

-- Teklif kabul/ret → teklifi veren firmanın sahibine
create or replace function public.notify_quote_decision()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  owner uuid;
begin
  if new.status is not distinct from old.status or new.status = 'pending' then
    return null;
  end if;
  select c.owner_id into owner from public.companies c where c.id = new.company_id;
  if owner is not null then
    perform public.notify(owner, 'quote.' || new.status,
      case when new.status = 'accepted' then 'Teklifiniz kabul edildi'
           else 'Teklifiniz reddedildi' end,
      null, '/rfq/' || new.rfq_id);
  end if;
  return null;
end $$;

drop trigger if exists quotes_notify_decision on quotes;
create trigger quotes_notify_decision after update on quotes
  for each row execute function public.notify_quote_decision();

-- Yeni mesaj → karşı tarafa
create or replace function public.notify_new_message()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  cv record; recipient uuid;
begin
  select * into cv from public.conversations where id = new.conversation_id;
  if cv.buyer_id = new.sender_id then
    select c.owner_id into recipient from public.companies c where c.id = cv.company_id;
  else
    recipient := cv.buyer_id;
  end if;
  if recipient is not null and recipient <> new.sender_id then
    perform public.notify(recipient, 'message.received', 'Yeni mesajınız var',
      left(new.body, 120), '/messages/' || new.conversation_id);
  end if;
  return null;
end $$;

drop trigger if exists messages_notify on messages;
create trigger messages_notify after insert on messages
  for each row execute function public.notify_new_message();

-- Sipariş durumu → karşı tarafa
create or replace function public.notify_order_status()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  owner uuid; target uuid;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return null;
  end if;
  select c.owner_id into owner from public.companies c where c.id = new.company_id;
  -- Durumu değiştiren kim ise diğerine haber ver.
  target := case when auth.uid() = new.buyer_id then owner else new.buyer_id end;
  if target is not null then
    perform public.notify(target, 'order.' || new.status,
      'Sipariş ' || new.code || ' güncellendi', new.status, '/orders/' || new.id);
  end if;
  return null;
end $$;

drop trigger if exists orders_notify_status on orders;
create trigger orders_notify_status after insert or update on orders
  for each row execute function public.notify_order_status();

-- Numune talebi → tedarikçiye
create or replace function public.notify_sample_request()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
declare owner uuid;
begin
  select c.owner_id into owner from public.companies c where c.id = new.company_id;
  if owner is not null then
    perform public.notify(owner, 'sample.requested', 'Yeni numune talebi', null, '/panel/samples');
  end if;
  return null;
end $$;

drop trigger if exists sample_requests_notify on sample_requests;
create trigger sample_requests_notify after insert on sample_requests
  for each row execute function public.notify_sample_request();

-- ============================================================
-- 6. TEDARİKÇİ PERFORMANS KARNESİ
--
-- response_rate / avg_response_hours elle girilebiliyordu — yani beyan.
-- Bu görünüm gerçek veriden hesaplar; firma profili bunu gösterir.
-- ============================================================

create or replace view public.company_performance
with (security_invoker = true) as
select
  c.id as company_id,
  (select count(*) from quotes q where q.company_id = c.id) as quotes_given,
  (select count(*) from quotes q where q.company_id = c.id and q.status = 'accepted') as quotes_accepted,
  (select count(*) from orders o where o.company_id = c.id and o.status = 'completed') as orders_completed,
  (select count(*) from orders o where o.company_id = c.id and o.status = 'cancelled') as orders_cancelled,
  (select count(*) from products p where p.company_id = c.id and p.status = 'active') as active_products
from companies c;

grant select on public.company_performance to anon, authenticated;

create index if not exists group_buys_product_idx on group_buys (product_id, status);
create index if not exists group_buy_participants_gb_idx on group_buy_participants (group_buy_id);
create index if not exists product_alerts_product_idx on product_alerts (product_id) where active;
create index if not exists import_jobs_company_idx on import_jobs (company_id, created_at desc);
