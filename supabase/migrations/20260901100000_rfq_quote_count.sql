-- ============================================================
-- RFQ teklif sayacı
--
-- Sorun: liste sayfaları teklif sayısını `quotes(count)` ile okuyordu.
-- RLS teklif satırlarını yalnızca taraflara gösterdiği için anonim
-- ziyaretçiye her RFQ "0 teklif" görünüyordu — yanlış bilgi.
--
-- Çözüm: teklif SAYISI herkese açık bir pazar sinyalidir, teklif İÇERİĞİ
-- gizli kalır. Sayıyı rfqs üzerinde denormalize edip tetikleyiciyle
-- güncel tutuyoruz. Liste sorguları da böylece tek tabloya iniyor.
-- ============================================================

alter table rfqs
  add column if not exists quote_count integer not null default 0
    check (quote_count >= 0);

create or replace function public.sync_rfq_quote_count()
returns trigger
language plpgsql
-- Tedarikçi teklif eklerken rfqs satırını güncelleme yetkisi yoktur;
-- sayaç için yükseltilmiş yetki gerekir. Burada yetki KARARI verilmediği,
-- yalnızca sayaç güncellendiği için definer bağlamı güvenli.
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    update public.rfqs set quote_count = quote_count + 1 where id = new.rfq_id;
  elsif tg_op = 'DELETE' then
    update public.rfqs set quote_count = greatest(quote_count - 1, 0) where id = old.rfq_id;
  end if;
  return null;
end;
$$;

drop trigger if exists quotes_sync_count on quotes;
create trigger quotes_sync_count
  after insert or delete on quotes
  for each row execute function public.sync_rfq_quote_count();

-- Mevcut satırları doldur.
update rfqs r
   set quote_count = coalesce(c.n, 0)
  from (select rfq_id, count(*) as n from quotes group by rfq_id) c
 where c.rfq_id = r.id;

update rfqs set quote_count = 0
 where id not in (select distinct rfq_id from quotes);
