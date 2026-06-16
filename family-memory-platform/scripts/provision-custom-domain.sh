#!/usr/bin/env bash
# Provision Let's Encrypt TLS for white-label custom domains queued by the API.
# Run on VPS as root or via sudo. Requires certbot + nginx or traefik with ACME.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
QUEUE_DIR="${CUSTOM_DOMAIN_TLS_QUEUE_DIR:-$ROOT/infra/custom-domains}"
QUEUE_FILE="$QUEUE_DIR/queue.json"
EMAIL="${LETSENCRYPT_EMAIL:-admin@familymemory.pro}"
WEBROOT="${CERTBOT_WEBROOT:-/var/www/certbot}"

if [[ ! -f "$QUEUE_FILE" ]]; then
  echo "No TLS queue at $QUEUE_FILE"
  exit 0
fi

domains=$(node -e "
  const fs = require('fs');
  const rows = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
  const pending = rows.filter(r => r.status === 'queued').map(r => r.domain);
  console.log([...new Set(pending)].join(' '));
" "$QUEUE_FILE")

if [[ -z "${domains// /}" ]]; then
  echo "No queued custom domains."
  exit 0
fi

for domain in $domains; do
  echo "==> Issuing certificate for $domain"
  certbot certonly --webroot -w "$WEBROOT" -d "$domain" \
    --non-interactive --agree-tos -m "$EMAIL" --keep-until-expiring || {
    echo "certbot failed for $domain" >&2
    continue
  }

  if command -v nginx >/dev/null 2>&1; then
    conf="$ROOT/infra/nginx/conf.d/custom-${domain//./-}.conf"
    cat > "$conf" <<EOF
# Auto-generated for $domain
server {
  listen 443 ssl http2;
  server_name $domain;

  ssl_certificate     /etc/letsencrypt/live/$domain/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/$domain/privkey.pem;

  location /api/ {
    proxy_pass http://127.0.0.1:4000/;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-Proto https;
  }

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-Proto https;
  }
}
EOF
    nginx -t && nginx -s reload || true
  fi

  if command -v traefik >/dev/null 2>&1 || docker ps --format '{{.Names}}' 2>/dev/null | grep -q traefik; then
    cp "$QUEUE_DIR/$domain.yml" /etc/traefik/dynamic/ 2>/dev/null || true
  fi

  node -e "
    const fs = require('fs');
    const file = process.argv[1];
    const domain = process.argv[2];
    const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const row of rows) {
      if (row.domain === domain && row.status === 'queued') row.status = 'issued';
    }
    fs.writeFileSync(file, JSON.stringify(rows, null, 2));
  " "$QUEUE_FILE" "$domain"
done

echo "Custom domain TLS provisioning complete."
