#!/usr/bin/env bash
# Yetki testleri — gerçek istek yolu üzerinden: HTTP + JWT + PostgREST + RLS.
# supabase/tests/rls.sql doğrudan psql ile çalışır; bu dosya ise uygulamanın
# gerçekte kullandığı yolu test eder. İkisi birlikte çalıştırılmalı.
#
# Kullanım:  npm run db:reset && bash supabase/tests/api-auth.sh
# (testler veriyi değiştirir; sonrasında db:reset yapın)
set -euo pipefail

API=${SUPABASE_URL:-http://127.0.0.1:54321}
ANON=${SUPABASE_ANON_KEY:-$(grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' .env.local | cut -d= -f2)}
DB=${SUPABASE_DB_CONTAINER:-supabase_db_supsto}
PASS=supsto123
fails=0

login() {
  curl -s "$API/auth/v1/token?grant_type=password" -H "apikey: $ANON" \
    -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"$PASS\"}" |
    python3 -c 'import sys,json;print(json.load(sys.stdin).get("access_token",""))'
}
rest() {
  curl -s -X "$1" "$API/rest/v1/$2" -H "apikey: $ANON" -H "Authorization: Bearer $3" \
    -H 'Content-Type: application/json' -H 'Prefer: return=representation' ${4:+-d "$4"}
}
sql() { docker exec -i "$DB" psql -U postgres -d postgres -tAq -c "$1"; }
check() { # ad gerçek beklenen
  if [ "$2" = "$3" ]; then printf '  ✓ %s\n' "$1"
  else printf '  ✗ %s  (gerçek=%s beklenen=%s)\n' "$1" "$2" "$3"; fails=$((fails+1)); fi
}

BUYER=$(login alici@supsto.local)
NOVA=$(login nova@supsto.local)
POLY=$(login polybox@supsto.local)
BID=a0000000-0000-4000-8000-000000000002
[ -n "$BUYER" ] || { echo "✗ giriş başarısız — seed uygulanmış mı?"; exit 1; }

echo "Yetki testleri"

rest POST rfqs "$BUYER" "{\"buyer_id\":\"$BID\",\"title\":\"API test talebi\",\"description\":\"gecerli bir aciklama metni\"}" >/dev/null
check "alıcı kendi adına RFQ açabilir" \
  "$(sql "select count(*) from rfqs where title='API test talebi'")" 1

r=$(rest POST rfqs "$BUYER" '{"buyer_id":"a0000000-0000-4000-8000-000000000003","title":"Sahte","description":"baskasinin adina"}')
check "başkası adına RFQ açamaz" \
  "$(echo "$r" | python3 -c 'import sys,json;d=json.load(sys.stdin);print("red" if isinstance(d,dict) else "gecti")')" red

rest PATCH "profiles?id=eq.$BID" "$BUYER" '{"role":"admin"}' >/dev/null
check "kullanıcı kendini admin yapamaz" "$(sql "select role from profiles where id='$BID'")" buyer

rest PATCH "companies?slug=eq.polybox" "$POLY" '{"verified":true}' >/dev/null
check "firma kendine doğrulama rozeti veremez" "$(sql "select verified from companies where slug='polybox'")" f

QID=$(sql "select id from quotes where company_id='c0000000-0000-4000-8000-000000000001' and rfq_id='e0000000-0000-4000-8000-000000000001'")
rest PATCH "quotes?id=eq.$QID" "$BUYER" '{"price":1.00,"status":"accepted"}' >/dev/null
check "alıcı teklif fiyatını değiştiremez" "$(sql "select price from quotes where id='$QID'")" 44.00
check "alıcı teklif durumunu değiştirebilir" "$(sql "select status from quotes where id='$QID'")" accepted

sql "update quotes set status='pending', price=44.00 where id='$QID'" >/dev/null
rest PATCH "quotes?id=eq.$QID" "$NOVA" '{"status":"accepted","price":39.00}' >/dev/null
check "tedarikçi kendi teklifini kabul edemez" "$(sql "select status from quotes where id='$QID'")" pending
check "tedarikçi kendi fiyatını değiştirebilir" "$(sql "select price from quotes where id='$QID'")" 39.00

r=$(rest POST quotes "$BUYER" '{"rfq_id":"e0000000-0000-4000-8000-000000000003","company_id":"c0000000-0000-4000-8000-000000000001","price":10}')
check "başka firma adına teklif verilemez" \
  "$(echo "$r" | python3 -c 'import sys,json;d=json.load(sys.stdin);print("red" if isinstance(d,dict) else "gecti")')" red

anon_count() { curl -s "$API/rest/v1/$1?select=id" -H "apikey: $ANON" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)))'; }
check "anonim teklifleri göremez"   "$(anon_count quotes)" 0
check "anonim profilleri göremez"   "$(anon_count profiles)" 0
# Sabit sayı yerine gerçek aktif firma sayısı: seed veya testler
# firma eklediğinde beklenti bayatlamasın.
check "anonim firmaları görebilir" \
  "$(anon_count companies)" "$(sql "select count(*) from companies where status='active'")"


# --- Ticaret çekirdeği (rozet, mesajlaşma, ürün sahipliği) ---
ADMIN=$(login admin@supsto.local)
POLY2=$(login polybox@supsto.local)

rest PATCH "companies?slug=eq.polybox" "$ADMIN" '{"verified":true}' >/dev/null
check "admin rozet verebilir" "$(sql "select verified from companies where slug='polybox'")" t
sql "update companies set verified=false, verified_at=null where slug='polybox'" >/dev/null

CID=$(rest POST conversations "$BUYER" '{"buyer_id":"a0000000-0000-4000-8000-000000000002","company_id":"c0000000-0000-4000-8000-000000000001"}' \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d[0]["id"] if isinstance(d,list) and d else "")')
check "alıcı görüşme açabilir" "$([ -n "$CID" ] && echo var || echo yok)" var
check "tedarikçi görüşmeyi görür" \
  "$(rest GET "conversations?select=id&id=eq.$CID" "$NOVA" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)))')" 1
check "üçüncü taraf görüşmeyi göremez" \
  "$(rest GET "conversations?select=id&id=eq.$CID" "$POLY2" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)))')" 0

rest PATCH "products?id=eq.d0000000-0000-4000-8000-000000000007" "$NOVA" '{"title":"Ele gecirildi"}' >/dev/null
check "başka firmanın ürünü düzenlenemez" \
  "$(sql "select title from products where id='d0000000-0000-4000-8000-000000000007'")" "Plastik Kasa 60x40x22"

echo
if [ "$fails" -eq 0 ]; then echo "Tüm testler geçti."; else echo "$fails test BAŞARISIZ."; exit 1; fi
