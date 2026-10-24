#!/usr/bin/env bash
# Contrôles sans écriture métier et sans envoi OTP.
# Usage : ./scripts/smoke.sh [web_base_url]
set -euo pipefail

WEB="${1:-https://www.monprofperso.com}"
WEB="${WEB%/}"
check() {
  local expected="$1" path="$2" code
  shift 2
  code=$(curl --connect-timeout 5 --max-time 15 -sS -o /dev/null -w "%{http_code}" "$@" "${WEB}${path}")
  echo "  ${path} → HTTP ${code} (attendu ${expected})"
  if [[ "$code" != "$expected" ]]; then
    echo "ERREUR: smoke échoué sur ${path}" >&2
    return 1
  fi
}

echo "==> Smoke ${WEB}"
check 200 /
check 200 /admin/
check 200 /espace/
check 200 /devenir-prof.html
check 200 /health
check 200 /api/subjects
check 200 /api/teachers
check 401 /api/me
check 401 /api/courses
check 401 /api/teacher/profile
check 401 /api/teacher-applications/status
check 401 /api/me -H 'Authorization: Bearer demo-token'
check 400 /api/auth/login -X POST -H 'Content-Type: application/json' --data '{}'

# En environnement exposé, une configuration de démonstration fait échouer la sonde.
if [[ "$WEB" == https://* ]]; then
  curl --connect-timeout 5 --max-time 15 -fsS "${WEB}/api/auth/otp-channels" |
    python3 -c 'import json,sys; d=json.load(sys.stdin); assert d.get("demo") is False, "mode démo actif sur un environnement exposé"'
fi

if [[ "$WEB" == "https://www.monprofperso.com" ]]; then
  code=$(curl --connect-timeout 5 --max-time 15 -sS -o /dev/null -w "%{http_code}" "https://monprofperso.com/")
  [[ "$code" == 301 || "$code" == 308 ]]
  location=$(curl --connect-timeout 5 --max-time 15 -sSI "https://monprofperso.com/" | awk -F': ' 'tolower($1)=="location"{print $2}' | tr -d '\r')
  [[ "$location" == "https://www.monprofperso.com/" ]]
fi
echo "==> Smoke OK"
