#!/usr/bin/env bash
# Ouverture après readiness métier et smoke bloquant.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec node -- "$ROOT/scripts/operations.mjs" activate "$@"
