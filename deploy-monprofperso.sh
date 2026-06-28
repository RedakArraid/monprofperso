#!/usr/bin/env bash
# Déploiement Mon Prof Perso sur VPS Contabo (Souley)
set -euo pipefail

APP_DIR="/root/monprofperso"
COMPOSE="docker compose -f backend/docker-compose.prod.yml --env-file backend/.env.production"

cd "$APP_DIR"

echo "==> Pull latest (branche prod)"
git fetch origin
git checkout prod 2>/dev/null || git checkout -b prod origin/prod
git pull --ff-only origin prod

echo "==> Build & start"
$COMPOSE up -d --build

echo "==> Status"
$COMPOSE ps

echo "==> Health (internal)"
docker exec monprofperso-api wget -qO- http://127.0.0.1:8099/health || true

echo "Done. Web: https://monprofperso.com | API: https://api.monprofperso.com"
