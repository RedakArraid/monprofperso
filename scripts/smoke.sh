#!/usr/bin/env bash
# Usage : ./scripts/smoke.sh https://www.monprofperso.com --sha SHA40 [--prepared]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="${1:-https://www.monprofperso.com}"
if [[ $# -gt 0 ]]; then shift; fi
exec node -- "$ROOT/scripts/operations.mjs" smoke --web "$WEB" "$@"
