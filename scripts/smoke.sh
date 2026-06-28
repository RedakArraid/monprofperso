#!/usr/bin/env bash
# Smoke test HTTP, usage : ./scripts/smoke.sh [web_base_url]
# Ex. prod  : ./scripts/smoke.sh https://monprofperso.com
# Ex. staging : ./scripts/smoke.sh https://staging.monprofperso.com
set -euo pipefail

WEB="${1:-https://www.monprofperso.com}"
WEB="${WEB%/}"

echo "==> Smoke ${WEB}"

code=$(curl -sS -o /dev/null -w "%{http_code}" "${WEB}/")
echo "  GET /           → HTTP ${code}"
[ "$code" = "200" ]

code=$(curl -sS -o /dev/null -w "%{http_code}" "${WEB}/admin/")
echo "  GET /admin/     → HTTP ${code}"
[ "$code" = "200" ]

code=$(curl -sS -o /dev/null -w "%{http_code}" "${WEB}/devenir-prof.html")
echo "  GET /devenir-prof.html → HTTP ${code}"
[ "$code" = "200" ]

body=$(curl -sS -X POST "${WEB}/api/auth/login" \
  -H "content-type: application/json" \
  -d '{"phone":"+2250700000001"}')
echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['user']['role']=='admin', d; print('  POST login      → admin OK')"

code=$(curl -sS -o /dev/null -w "%{http_code}" "${WEB}/api/subjects")
echo "  GET /api/subjects → HTTP ${code}"
[ "$code" = "200" ]

body=$(curl -sS "${WEB}/api/teacher-applications/status?phone=%2B2250700000099")
echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'status' in d, d; print('  GET teacher-applications/status → OK')"

echo "==> Smoke OK"

# Prod : l'apex doit rediriger vers www (canonique Traefik).
if [[ "$WEB" == "https://www.monprofperso.com" ]]; then
  loc=$(curl -sS -o /dev/null -w "%{http_code} %{redirect_url}" -L --max-redirs 0 "https://monprofperso.com/" || true)
  code="${loc%% *}"
  target="${loc#* }"
  echo "  GET apex → ${code} ${target}"
  [ "$code" = "301" ] || [ "$code" = "308" ] || { echo "WARN: apex sans redirect 301"; }
  [[ "$target" == https://www.monprofperso.com/* ]] || [[ "$target" == https://www.monprofperso.com ]] || { echo "WARN: redirect apex inattendu"; }
fi
