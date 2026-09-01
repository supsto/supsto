#!/usr/bin/env bash
# Veritabanı iş kuralı ve yetki testleri.
#
# Üç paketi birden koşar ve TEK bir özet verir. Paketler `&&` ile
# zincirlenmez: bazı testler bilerek hata üretir (RLS reddi beklenen
# sonuçtur) ve zinciri erken kesiyorlardı.
#
# Kullanım: npm run db:test   (local Supabase ayakta olmalı)
set -uo pipefail

DB=${SUPABASE_DB_CONTAINER:-supabase_db_supsto}
failed=0

if ! docker exec "$DB" pg_isready -U postgres >/dev/null 2>&1; then
  echo "✗ Veritabanı ayakta değil. Önce: npm run db:start"
  exit 1
fi

echo "Veritabanı sıfırlanıyor…"
npx --yes supabase@latest db reset >/dev/null 2>&1 || {
  echo "✗ db reset başarısız"; exit 1;
}

run_sql() {
  local name=$1 file=$2
  echo
  echo "── $name ─────────────────────────────"
  local out
  out=$(docker exec -i "$DB" psql -U postgres -d postgres -q < "$file" 2>&1)
  # Testler sonucu ✓ / ✗ ile yazdırır; ERROR satırları beklenen
  # reddetmeler olabilir, o yüzden ölçüt ✗ ve "AÇIK VAR".
  echo "$out" | grep -E '===|✓|✗|AÇIK VAR|HATA' | sed 's/^/  /'
  if echo "$out" | grep -qE '✗|AÇIK VAR|HATA ✗'; then
    failed=$((failed + 1))
  fi
}

run_sql "RLS politikaları" supabase/tests/rls.sql
run_sql "Ticaret kuralları" supabase/tests/commerce.sql

echo
echo "── API yetki testleri ────────────────"
if bash supabase/tests/api-auth.sh 2>&1 | sed 's/^/  /'; then :; else failed=$((failed + 1)); fi

echo
if [ "$failed" -eq 0 ]; then
  echo "✓ Tüm veritabanı testleri geçti."
else
  echo "✗ $failed pakette başarısızlık var."
  exit 1
fi
