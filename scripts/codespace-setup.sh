#!/usr/bin/env bash
# GitHub Codespaces için yerel ortam ayarı.
#
# SORUN: Codespace'te tarayıcınız konteynerin DIŞINDADIR. `localhost:3000`
# ve `127.0.0.1:54321` yalnızca konteyner içinden erişilebilir. Bu yüzden
# varsayılan ayarlarla:
#   · e-posta doğrulama linkleri açılmaz (127.0.0.1'e işaret eder)
#   · tarayıcıdan yapılan Supabase çağrıları (görsel yükleme, alarm,
#     karşılaştırma) sessizce başarısız olur
#
# Bu betik iletilen (forwarded) adresleri hesaplayıp .env.local ile
# supabase/config.toml dosyalarını günceller ve gerekli portları
# herkese açık yapar.
#
# NOT: 54321 portu public olmalı — Supabase istemcisi apikey başlığıyla
# çağrı yapar, private port ise GitHub oturum çerezi ister ve HTML
# oturum sayfası döner. Yereldeki anahtarlar Supabase'in herkese açık
# demo anahtarlarıdır, gizli değildir.
set -euo pipefail

if [ -z "${CODESPACE_NAME:-}" ]; then
  echo "Codespace değilsiniz; bu betiğe gerek yok."
  echo "Yerelde .env.example varsayılanları (localhost) doğrudan çalışır."
  exit 0
fi

DOMAIN=${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}
url() { echo "https://${CODESPACE_NAME}-$1.${DOMAIN}"; }

APP_URL=$(url 3000)
SUPABASE_URL=$(url 54321)
MAIL_URL=$(url 54324)

echo "Adresler:"
echo "  uygulama : $APP_URL"
echo "  supabase : $SUPABASE_URL"
echo "  mailpit  : $MAIL_URL"
echo

# ---- 1. Portları herkese açık yap ----
echo "Portlar açılıyor…"
for p in 3000 54321 54324; do
  gh codespace ports visibility "$p:public" -c "$CODESPACE_NAME" >/dev/null 2>&1 \
    && echo "  ✓ $p public" \
    || echo "  ! $p ayarlanamadı — VS Code > Bağlantı Noktaları > sağ tık > Görünürlük > Public"
done

# ---- 2. .env.local ----
ANON=$(grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' .env.local 2>/dev/null | cut -d= -f2- || true)
SERVICE=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env.local 2>/dev/null | cut -d= -f2- || true)
if [ -z "$ANON" ]; then
  echo "  ! .env.local içinde ANON anahtarı yok. Önce: npm run db:start"
  exit 1
fi

cat > .env.local <<ENV
# GitHub Codespaces — scripts/codespace-setup.sh tarafından üretildi.
# Tarayıcı konteynerin dışında olduğu için iletilen adresler kullanılır.
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON
SUPABASE_SERVICE_ROLE_KEY=$SERVICE
NEXT_PUBLIC_SITE_URL=$APP_URL
ENV
echo "  ✓ .env.local güncellendi"

# ---- 3. supabase/config.toml ----
python3 - "$APP_URL" <<'PY'
import re, sys, pathlib
app = sys.argv[1]
p = pathlib.Path('supabase/config.toml')
s = p.read_text()
s = re.sub(r'^site_url = ".*"$', f'site_url = "{app}"', s, count=1, flags=re.M)
s = re.sub(
    r'^additional_redirect_urls = \[.*\]$',
    f'additional_redirect_urls = ["{app}", "{app}/auth/callback", '
    f'"http://localhost:3000", "http://localhost:3000/auth/callback"]',
    s, count=1, flags=re.M)
p.write_text(s)
PY
echo "  ✓ supabase/config.toml güncellendi"

echo
echo "Supabase yeniden başlatılıyor (GoTrue yeni adresi alsın)…"
npx --yes supabase@latest stop >/dev/null 2>&1 || true
npx --yes supabase@latest start >/dev/null 2>&1

echo
echo "Hazır. Şimdi: npm run dev"
echo "  Site   : $APP_URL"
echo "  E-posta: $MAIL_URL"
