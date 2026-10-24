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

echo "==> Build & start (staging)"
$COMPOSE up -d --build
# nginx lit le volume web/ : forcer un recreate pour prendre les nouveaux fichiers
$COMPOSE up -d --force-recreate web

echo "==> Status"
$COMPOSE ps

echo "==> Health (attente API, max 60s)"
for i in $(seq 1 30); do
  if docker exec monprofperso-staging-api wget -qO- http://127.0.0.1:8099/health 2>/dev/null | grep -q ok; then
    echo "  API ready (${i}x2s)"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ERREUR: API indisponible après 60 secondes"
    docker logs monprofperso-staging-api --tail 30 2>&1 || true
    exit 1
  fi
  sleep 2
done

if [ -f scripts/smoke.sh ]; then
  bash scripts/smoke.sh https://staging.monprofperso.com
fi

echo "Done. Web: https://staging.monprofperso.com | API: https://staging-api.monprofperso.com"
