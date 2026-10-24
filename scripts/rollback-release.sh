#!/usr/bin/env bash
# Retour de code seulement si le schéma correspond à la version cible.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec node -- "$ROOT/scripts/operations.mjs" rollback "$@"
