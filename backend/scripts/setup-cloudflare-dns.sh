#!/usr/bin/env bash
# Crée les enregistrements DNS Cloudflare pour Mon Prof Perso (VPS Contabo).
# Prérequis : CLOUDFLARE_API_TOKEN avec permission Zone → DNS → Edit sur monprofperso.com
set -euo pipefail

ZONE_ID="${CLOUDFLARE_ZONE_ID:-905e86baa09a6ce26830ea4249addec6}"
ORIGIN_IP="${MP2_ORIGIN_IP:-178.238.229.159}"
TOKEN="${CLOUDFLARE_API_TOKEN:?Définir CLOUDFLARE_API_TOKEN}"

upsert_a() {
  local name=$1
  local fqdn=$2
  local existing
  existing=$(curl -sS -G "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
    -H "Authorization: Bearer ${TOKEN}" \
    --data-urlencode "name=${fqdn}" \
    --data-urlencode "type=A")
  local id
  id=$(python3 -c "import json,sys; d=json.load(sys.stdin); r=d.get('result') or []; print(r[0]['id'] if r else '')" <<< "$existing")
  local payload
  payload=$(python3 -c "import json; print(json.dumps({'type':'A','name':'${name}','content':'${ORIGIN_IP}','ttl':1,'proxied':False}))")
  if [ -n "$id" ]; then
    curl -sS -X PUT "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${id}" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json" \
      --data "$payload"
  else
    curl -sS -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json" \
      --data "$payload"
  fi
  echo
}

upsert_a "monprofperso.com" "monprofperso.com"
upsert_a "www" "www.monprofperso.com"
upsert_a "api" "api.monprofperso.com"
upsert_a "staging" "staging.monprofperso.com"
upsert_a "staging-api" "staging-api.monprofperso.com"

echo "DNS OK → ${ORIGIN_IP}"
echo "  monprofperso.com"
echo "  www.monprofperso.com"
echo "  api.monprofperso.com"
echo "  staging.monprofperso.com"
echo "  staging-api.monprofperso.com"
