#!/usr/bin/env bash
# Rituel local : dev → staging (merge + push + déploiement VPS).
# Prérequis : branche dev à jour, accès SSH vps-contabo, DNS staging configuré.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
SSH_HOST="${MP2_SSH:-vps-contabo}"

echo "==> 1/4, Vérifier dev"
git fetch origin
git checkout dev
git pull --ff-only origin dev

echo "==> 2/4, Merger dev → staging"
git checkout staging
git pull --ff-only origin staging
git merge dev --no-edit

echo "==> 3/4, Pousser staging"
git push origin staging

echo "==> 4/4, Déployer sur le VPS (branche staging)"
ssh "$SSH_HOST" "bash -s" < "$ROOT/scripts/deploy-staging.sh"

echo ""
echo "Staging déployé. Tester :"
echo "  https://staging.monprofperso.com/admin/"
echo "  ./scripts/smoke.sh https://staging.monprofperso.com"
echo ""
echo "Si OK → ./scripts/release-prod.sh"
