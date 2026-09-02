-- ============================================================
-- Çok parametreli pazarlık
--
-- B2B'yi perakendeden ayıran şey, pazarlığın yalnızca FİYAT üzerinden
-- yapılmaması. Taraflar termin, peşinat oranı, vade, teslim şekli ve
-- kabul edilebilir defo oranını birlikte pazarlık eder; birinde verilen
-- taviz diğerinden alınır.
--
-- quote_revisions bu turların kaydıdır, quotes ise yürürlükteki teklif.
-- İkisine de aynı alanlar ekleniyor ki her turun tam anlaşma önerisi
-- geriye dönük okunabilsin.
--
-- Ödeme şartı BİLEREK "peşinat yüzdesi + vade günü" olarak modellendi:
-- escrow ve BNPL platformda yok; olmayan bir finansal ürünü şemaya
-- yazmak, arayüzde de vaat edilmesine yol açar.
-- ============================================================

do $$
declare
  t text;
begin
  foreach t in array array['quotes', 'quote_revisions'] loop
    execute format($f$
      alter table %I
        add column if not exists incoterm text
          check (incoterm is null or incoterm in (
            'EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP'
          )),
        add column if not exists advance_pct smallint
          check (advance_pct is null or advance_pct between 0 and 100),
        add column if not exists payment_days smallint
          check (payment_days is null or payment_days between 0 and 365),
        add column if not exists defect_tolerance_pct numeric(5, 2)
          check (defect_tolerance_pct is null
                 or defect_tolerance_pct between 0 and 100)
    $f$, t);
  end loop;
end
$$;

comment on column quotes.advance_pct is
  'Peşin ödenecek yüzde; kalanı payment_days gün vadeli. Escrow/BNPL değildir.';
comment on column quotes.defect_tolerance_pct is
  'Alıcının kabul ettiği azami defo oranı. Kalite anlaşmazlığının ölçüsü.';

-- ---------- Anlaşma anı ----------
-- Teklif kabul edildiğinde yürürlükteki şartların donduğu an. Sözleşme
-- metni bu andan üretilir; sonraki düzenlemeler yeni bir tur açar.
alter table quotes
  add column if not exists agreed_at timestamptz;

/*
  Kabul edilen teklifin şartları donmalı: kabul sonrası tedarikçinin
  fiyatı değiştirebilmesi, alıcının kabul ettiği şeyden farklı bir
  siparişe yol açardı. Uygulama katmanı bunu zaten engelliyor ama
  tek savunma hattı olarak bırakılamaz.
*/
create or replace function public.freeze_agreed_quote()
returns trigger
language plpgsql
as $$
begin
  if old.agreed_at is not null then
    if new.price is distinct from old.price
      or new.moq is distinct from old.moq
      or new.delivery_days is distinct from old.delivery_days
      or new.incoterm is distinct from old.incoterm
      or new.advance_pct is distinct from old.advance_pct
      or new.payment_days is distinct from old.payment_days
      or new.defect_tolerance_pct is distinct from old.defect_tolerance_pct
    then
      raise exception
        'Anlaşmaya varılmış teklifin şartları değiştirilemez (quote %).', old.id;
    end if;
  end if;
  return new;
end
$$;

-- SECURITY DEFINER YOK: koruma tetiği çağıranın yetkisiyle çalışmalı.
drop trigger if exists quotes_freeze_agreed on quotes;
create trigger quotes_freeze_agreed
  before update on quotes
  for each row execute function public.freeze_agreed_quote();

-- ---------- Sipariş, pazarlıkta anlaşılanı taşır ----------
alter table orders
  add column if not exists advance_pct smallint
    check (advance_pct is null or advance_pct between 0 and 100),
  add column if not exists payment_days smallint
    check (payment_days is null or payment_days between 0 and 365),
  add column if not exists defect_tolerance_pct numeric(5, 2)
    check (defect_tolerance_pct is null
           or defect_tolerance_pct between 0 and 100);

create index if not exists quotes_agreed_idx on quotes (agreed_at)
  where agreed_at is not null;
