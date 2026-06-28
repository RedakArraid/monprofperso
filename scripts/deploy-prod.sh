#!/usr/bin/env bash
# Déploiement PRODUCTION sur VPS Contabo (branche prod).
set -euo pipefail

APP_DIR="${APP_DIR:-/root/monprofperso}"
COMPOSE="docker compose -f backend/docker-compose.prod.yml --env-file backend/.env.production"
BRANCH="prod"

cd "$APP_DIR"

echo "==> Pull latest (branche ${BRANCH})"
git fetch origin
git checkout "${BRANCH}" 2>/dev/null || git checkout -b "${BRANCH}" "origin/${BRANCH}"
git pull --ff-only "origin/${BRANCH}"

echo "==> Build & start (prod)"
$COMPOSE up -d --build

echo "==> Status"
$COMPOSE ps

echo "==> Health"
docker exec monprofperso-api wget -qO- http://127.0.0.1:8099/health || true

if [ -f scripts/smoke.sh ]; then
  bash scripts/smoke.sh https://monprofperso.com || echo "WARN: smoke prod échoué (DNS/cert ?)"
fi

echo "Done. Web: https://monprofperso.com | API: https://api.monprofperso.com"
