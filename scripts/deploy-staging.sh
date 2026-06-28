#!/usr/bin/env bash
# Déploiement STAGING sur VPS Contabo (branche staging).
set -euo pipefail

APP_DIR="${APP_DIR:-/root/monprofperso-staging}"
COMPOSE="docker compose -f backend/docker-compose.staging.yml --env-file backend/.env.staging"
BRANCH="staging"
REPO="${MP2_REPO:-git@github.com:RedakArraid/monprofperso.git}"

if [ ! -d "$APP_DIR/.git" ]; then
  echo "==> Premier déploiement : clone dans ${APP_DIR}"
  git clone "$REPO" "$APP_DIR"
fi

cd "$APP_DIR"

if [ ! -f backend/.env.staging ]; then
  echo "ERREUR: backend/.env.staging manquant sur le VPS."
  echo "  cp backend/.env.staging.example backend/.env.staging"
  echo "  (ou copier depuis .env.production en changeant POSTGRES_DB et S3_BUCKET)"
  exit 1
fi

echo "==> Pull latest (branche ${BRANCH})"
git fetch origin
git checkout "${BRANCH}" 2>/dev/null || git checkout -b "${BRANCH}" "origin/${BRANCH}"
git pull --ff-only "origin/${BRANCH}"

echo "==> Build & start (staging)"
$COMPOSE up -d --build

echo "==> Status"
$COMPOSE ps

echo "==> Health"
docker exec monprofperso-staging-api wget -qO- http://127.0.0.1:8099/health || true

if [ -f scripts/smoke.sh ]; then
  bash scripts/smoke.sh https://staging.monprofperso.com || echo "WARN: smoke staging échoué (DNS/cert ?)"
fi

echo "Done. Web: https://staging.monprofperso.com | API: https://staging-api.monprofperso.com"
