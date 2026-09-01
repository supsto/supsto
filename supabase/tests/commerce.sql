\set ON_ERROR_STOP off
\pset pager off
-- Ticaret kuralları testi. Kullanım: npm run db:reset && npm run db:test

\set buyer    '''a0000000-0000-4000-8000-000000000002'''
\set nova     '''a0000000-0000-4000-8000-000000000003'''
\set novaco   '''c0000000-0000-4000-8000-000000000001'''
\set product  '''d0000000-0000-4000-8000-000000000001'''
\set rfq      '''e0000000-0000-4000-8000-000000000001'''

\echo '=== Hazırlık: teklif kabul edilir, sipariş açılır ==='
update quotes set status='accepted' where rfq_id=:rfq and company_id=:novaco;
insert into orders (id, buyer_id, company_id, quote_id, title, quantity, unit_price, currency)
select 'f0000000-0000-4000-8000-000000000001', :buyer, :novaco, q.id, '5.000 kraft koli', 5000, 44.00, 'TRY'
from quotes q where q.rfq_id=:rfq and q.company_id=:novaco;
select '  kod=' || code || ' toplam=' || total_amount || ' durum=' || status from orders limit 1;

\echo ''
\echo '=== 1. Alıcı siparişi kendi "confirmed" yapabilir mi? (BEKLENEN: hayır) ==='
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}';
  update orders set status='confirmed' where id='f0000000-0000-4000-8000-000000000001';
rollback;

\echo ''
\echo '=== 2. Tedarikçi "confirmed" yapabilir mi? (BEKLENEN: evet) ==='
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}';
  update orders set status='confirmed' where id='f0000000-0000-4000-8000-000000000001';
commit;
select '  durum=' || status || ' -> ' ||
  case when status='confirmed' then 'TEDARİKÇİ ONAYLADI ✓' else 'HATA ✗' end
from orders where id='f0000000-0000-4000-8000-000000000001';

\echo ''
\echo '=== 3. Durum atlanabilir mi? confirmed -> completed (BEKLENEN: hayır) ==='
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}';
  update orders set status='completed' where id='f0000000-0000-4000-8000-000000000001';
rollback;

\echo ''
\echo '=== 4. Sipariş açıldıktan sonra fiyat değiştirilebilir mi? (BEKLENEN: hayır) ==='
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}';
  update orders set unit_price=1.00, status='in_production' where id='f0000000-0000-4000-8000-000000000001';
commit;
select '  fiyat=' || unit_price || ' -> ' ||
  case when unit_price=44.00 then 'FİYAT KORUNDU ✓' else 'AÇIK VAR ✗' end
from orders where id='f0000000-0000-4000-8000-000000000001';

\echo ''
\echo '=== 5. Durum geçmişi tutuluyor mu? ==='
select '  ' || coalesce(from_status,'—') || ' -> ' || to_status
from order_events where order_id='f0000000-0000-4000-8000-000000000001' order by created_at;

\echo ''
\echo '=== 6. Kabul edilmemiş teklifden sipariş açılabilir mi? (BEKLENEN: hayır) ==='
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}';
  insert into orders (buyer_id, company_id, quote_id, title, quantity, unit_price)
  select :buyer, c.id, q.id, 'Uydurma', 1, 1 from quotes q join companies c on c.id=q.company_id
   where q.status='pending' limit 1;
rollback;

\echo ''
\echo '=== 7. Toplu alım havuzu: taahhüt toplanıyor, hedefe ulaşınca durum değişiyor mu? ==='
insert into group_buys (id, product_id, initiator_id, target_quantity, deadline)
values ('11111111-0000-4000-8000-000000000001', :product, :buyer, 300, current_date + 30);
insert into group_buy_participants (group_buy_id, buyer_id, quantity)
values ('11111111-0000-4000-8000-000000000001', :buyer, 120);
select '  120 sonrası: toplam=' || committed_quantity || ' durum=' || status from group_buys;
insert into group_buy_participants (group_buy_id, buyer_id, quantity)
values ('11111111-0000-4000-8000-000000000001', :nova, 200);
select '  +200 sonrası: toplam=' || committed_quantity || ' durum=' || status || ' -> ' ||
  case when committed_quantity=320 and status='reached' then 'HAVUZ DOLDU ✓' else 'HATA ✗' end
from group_buys;

\echo ''
\echo '=== 8. Firma kendine sertifika doğrulaması verebilir mi? (BEKLENEN: hayır) ==='
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}';
  insert into company_certificates (company_id, kind, name, verified)
  values (:novaco, 'iso', 'ISO 9001', true);
commit;
select '  verified=' || verified || ' -> ' ||
  case when not verified then 'SAHTE SERTİFİKA ENGELLENDİ ✓' else 'AÇIK VAR ✗' end
from company_certificates where company_id=:novaco;

\echo ''
\echo '=== 9. Bildirimler üretildi mi? ==='
select '  ' || type || ' -> ' || title from notifications order by created_at limit 6;
