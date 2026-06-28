#!/usr/bin/env bash
# Rituel local : staging → prod (merge + push + déploiement VPS).
# À lancer uniquement après validation sur staging.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
SSH_HOST="${MP2_SSH:-vps-contabo}"

if [ "${1:-}" != "--yes" ]; then
  echo "Confirmer la mise en production (staging validé) ?"
  echo "  Relancer avec : $0 --yes"
  exit 1
fi

echo "==> 1/4, Vérifier staging"
git fetch origin
git checkout staging
git pull --ff-only origin staging

echo "==> 2/4, Merger staging → prod"
git checkout prod
git pull --ff-only origin prod
git merge staging --no-edit

echo "==> 3/4, Pousser prod"
git push origin prod

echo "==> 4/4, Déployer sur le VPS (branche prod)"
ssh "$SSH_HOST" "bash -s" < "$ROOT/scripts/deploy-prod.sh"

echo ""
echo "Production déployée :"
echo "  https://monprofperso.com/admin/"
echo "  ./scripts/smoke.sh https://monprofperso.com"
