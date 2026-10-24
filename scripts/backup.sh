#!/usr/bin/env bash
# Sauvegarde cohérente PostgreSQL + objets vers restic.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec node -- "$ROOT/scripts/operations.mjs" backup "$@"
