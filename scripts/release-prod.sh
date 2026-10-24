#!/usr/bin/env bash
# Depuis le poste opérateur : CI du SHA exact puis préparation distante fermée.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec node -- "$ROOT/scripts/operations.mjs" release --environment prod "$@"
