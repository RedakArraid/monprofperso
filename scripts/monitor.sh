#!/usr/bin/env bash
# Sondes et âge de sauvegarde ; alerte seulement si explicitement configurée.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec node -- "$ROOT/scripts/operations.mjs" monitor "$@"
