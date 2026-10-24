#!/usr/bin/env bash
# Déploiement PRODUCTION sur VPS Contabo (branche main).
set -euo pipefail

APP_DIR="${APP_DIR:-/root/monprofperso}"
COMPOSE="docker compose -f backend/docker-compose.prod.yml --env-file backend/.env.production"
BRANCH="main"

cd "$APP_DIR"

echo "==> Pull latest (branche ${BRANCH})"
git fetch origin
git checkout "${BRANCH}" 2>/dev/null || git checkout -b "${BRANCH}" "origin/${BRANCH}"
git pull --ff-only origin "${BRANCH}"

if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
  echo "ERREUR: Node.js 24 et npm sont requis pour construire les assets de cette révision."
  exit 1
fi
NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 24 ]; then
  echo "ERREUR: Node.js 24 minimum requis (version actuelle : ${NODE_MAJOR})."
  exit 1
fi
echo "==> Build espace React (webapp → web/espace)"
(cd webapp && npm ci --ignore-scripts && npm run build)

echo "==> Build & start (prod)"
$COMPOSE up -d --build
$COMPOSE up -d --force-recreate web

echo "==> Status"
$COMPOSE ps

echo "==> Health (attente API, max 60s)"
for i in $(seq 1 30); do
  if docker exec monprofperso-api wget -qO- http://127.0.0.1:8099/health 2>/dev/null | grep -q ok; then
    echo "  API ready (${i}x2s)"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ERREUR: API indisponible après 60 secondes"
    docker logs monprofperso-api --tail 30 2>&1 || true
    exit 1
  fi
  sleep 2
done

if [ -f scripts/smoke.sh ]; then
  bash scripts/smoke.sh https://www.monprofperso.com
fi

echo "Done. Web: https://www.monprofperso.com | API: https://api.monprofperso.com"
