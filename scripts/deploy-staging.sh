#!/usr/bin/env bash
# Sur le serveur : prépare un SHA exact en maintenance, sans merge ni push.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec node -- "$ROOT/scripts/operations.mjs" deploy --environment staging "$@"
