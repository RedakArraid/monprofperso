#!/usr/bin/env bash
# Extraction et vérification uniquement ; aucune base active écrasée.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec node -- "$ROOT/scripts/operations.mjs" restore "$@"
