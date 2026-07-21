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

if [ -d webapp ] && command -v npm >/dev/null 2>&1; then
  NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)"
  if [ "$NODE_MAJOR" -ge 20 ]; then
    echo "==> Build espace React (webapp → web/espace)"
    (cd webapp && npm ci && npm run build)
  else
    echo "==> Skip build webapp (Node ${NODE_MAJOR} < 20) — assets commités dans web/espace/"
  fi
fi

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
    echo "  WARN: API health timeout"
    docker logs monprofperso-api --tail 30 2>&1 || true
  fi
  sleep 2
done

if [ -f scripts/smoke.sh ]; then
  bash scripts/smoke.sh https://www.monprofperso.com || echo "WARN: smoke prod échoué"
fi

echo "Done. Web: https://www.monprofperso.com | API: https://api.monprofperso.com"
