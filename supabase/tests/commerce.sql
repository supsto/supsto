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
select '  120 sonrası: toplam=' || committed_quantity || ' durum=' || status
  from group_buys where id='11111111-0000-4000-8000-000000000001';
insert into group_buy_participants (group_buy_id, buyer_id, quantity)
values ('11111111-0000-4000-8000-000000000001', :nova, 200);
select '  +200 sonrası: toplam=' || committed_quantity || ' durum=' || status || ' -> ' ||
  case when committed_quantity=320 and status='reached' then 'HAVUZ DOLDU ✓' else 'HATA ✗' end
from group_buys where id='11111111-0000-4000-8000-000000000001';

\echo ''
\echo '=== 8. Firma kendine sertifika doğrulaması verebilir mi? (BEKLENEN: hayır) ==='
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}';
  insert into company_certificates (company_id, kind, name, verified)
  values (:novaco, 'iso', 'TEST SAHTE BELGE', true);
commit;
-- Yalnızca testin eklediği kayda bakılır; seed'de admin tarafından
-- doğrulanmış gerçek sertifikalar da var.
select '  verified=' || verified || ' -> ' ||
  case when not verified then 'SAHTE SERTİFİKA ENGELLENDİ ✓' else 'AÇIK VAR ✗' end
from company_certificates where name='TEST SAHTE BELGE';

\echo ''
\echo '=== 9. Bildirimler üretildi mi? ==='
select '  ' || type || ' -> ' || title from notifications order by created_at limit 6;

\echo ''
\echo '=== 10. Tamamlanmamış siparişe yorum yazılabilir mi? (BEKLENEN: hayır) ==='
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}';
  insert into reviews (order_id, company_id, author_id, rating, comment)
  values ('f0000000-0000-4000-8000-000000000001', :novaco, :buyer, 5, 'Harika bir tedarikci');
rollback;

\echo ''
\echo '=== 11. Tamamlanmış siparişe yorum + puan özeti ==='
update orders set status='shipped' where id='f0000000-0000-4000-8000-000000000001';
update orders set status='delivered' where id='f0000000-0000-4000-8000-000000000001';
update orders set status='completed' where id='f0000000-0000-4000-8000-000000000001';
insert into reviews (order_id, company_id, author_id, rating, quality_rating, comment)
values ('f0000000-0000-4000-8000-000000000001', :novaco, :buyer, 5, 4, 'Zamaninda teslim, kalite iyi');
select '  puan=' || rating_average || ' adet=' || rating_count || ' -> ' ||
  case when rating_average=5.00 and rating_count=1 then 'PUAN ÖZETİ GÜNCELLENDİ ✓' else 'HATA ✗' end
from companies where id=:novaco;

\echo ''
\echo '=== 12. Tedarikçi kendi puanını değiştirebilir mi? (BEKLENEN: hayır, yanıt yazabilir) ==='
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}';
  update reviews set rating=1, reply='Tesekkur ederiz' where company_id=:novaco;
commit;
select '  puan=' || rating || ' yanıt=' || coalesce(reply,'yok') || ' -> ' ||
  case when rating=5 and reply is not null then 'PUAN KORUNDU, YANIT EKLENDİ ✓' else 'HATA ✗' end
from reviews where company_id=:novaco;

\echo ''
\echo '=== 13. Aynı siparişe ikinci yorum? (BEKLENEN: hayır) ==='
begin;
  insert into reviews (order_id, company_id, author_id, rating)
  values ('f0000000-0000-4000-8000-000000000001', :novaco, :buyer, 1);
rollback;

\echo ''
\echo '=== 14. Raporlanan içeriği suçlanan taraf görebilir mi? (BEKLENEN: hayır) ==='
insert into reports (reporter_id, product_id, reason, detail)
values (:buyer, :product, 'misleading', 'Aciklama urunle uyusmuyor');
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}';
  select '  tedarikçinin gördüğü rapor: ' || count(*) || ' -> ' ||
    case when count(*)=0 then 'GİZLİ ✓' else 'AÇIK VAR ✗' end from reports;
commit;
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}';
  select '  adminin gördüğü rapor: ' || count(*) || ' -> ' ||
    case when count(*)=1 then 'ADMİN GÖRÜYOR ✓' else 'HATA ✗' end from reports;
commit;

\echo ''
\echo '=== 15. Kullanıcı rolünü perakendeci→toptancı değiştirebilir mi? (BEKLENEN: evet) ==='
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}';
  update profiles set role='supplier' where id=:buyer;
commit;
select '  rol=' || role || ' -> ' ||
  case when role='supplier' then 'ROL DEĞİŞTİRİLEBİLDİ ✓' else 'HATA ✗' end
from profiles where id=:buyer;

\echo ''
\echo '=== 16. Kullanıcı kendi telefonunu doğrulanmış işaretleyebilir mi? (BEKLENEN: hayır) ==='
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}';
  update profiles set phone_verified=true where id=:buyer;
commit;
select '  phone_verified=' || phone_verified || ' -> ' ||
  case when not phone_verified then 'SAHTE DOĞRULAMA ENGELLENDİ ✓' else 'AÇIK VAR ✗' end
from profiles where id=:buyer;

\echo ''
\echo '=== 17. Doğrulama talebi: firma açar, admin onaylayınca rozet gelir ==='
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000006","role":"authenticated"}';
  insert into company_verifications (company_id, requested_by, note, status)
  values ('c0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000006','Belgeler hazir','approved');
commit;
select '  talep durumu=' || status || ' -> ' ||
  case when status='pending' then 'FİRMA KENDİ ONAYLAYAMADI ✓' else 'AÇIK VAR ✗' end
from company_verifications where company_id='c0000000-0000-4000-8000-000000000004';

begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}';
  update company_verifications set status='approved', reviewed_by='a0000000-0000-4000-8000-000000000001'
   where company_id='c0000000-0000-4000-8000-000000000004';
commit;
select '  rozet=' || verified || ' -> ' ||
  case when verified then 'ADMİN ONAYI ROZETİ VERDİ ✓' else 'HATA ✗' end
from companies where id='c0000000-0000-4000-8000-000000000004';

\echo ''
\echo '=== 18. Aynı firmaya ikinci bekleyen talep? (BEKLENEN: hayır) ==='
begin;
  insert into company_verifications (company_id, status) values ('c0000000-0000-4000-8000-000000000003','pending');
  insert into company_verifications (company_id, status) values ('c0000000-0000-4000-8000-000000000003','pending');
rollback;
