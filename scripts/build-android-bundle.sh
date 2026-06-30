#!/usr/bin/env bash
# Génère l'Android App Bundle (.aab) signé pour Google Play.
# Prérequis : JDK 17+, Android SDK, keystore.properties + fichier .jks
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID="$ROOT/android"
KEYSTORE_PROPS="$ANDROID/keystore.properties"
OUT="$ANDROID/app/build/outputs/bundle/release/app-release.aab"

# shellcheck source=android-env.sh
source "$ROOT/scripts/android-env.sh"

cd "$ANDROID"

if [ ! -f keystore.properties ]; then
  echo "ERREUR: $KEYSTORE_PROPS manquant."
  echo ""
  echo "  Lancez d'abord : ./scripts/setup-android-signing.sh"
  echo "  (configure Java + keystore en une fois)"
  echo ""
  echo "  Voir docs/APP-BUNDLE-ANDROID.md"
  exit 1
fi

if [ -z "${JAVA_HOME:-}" ] || ! command -v java >/dev/null 2>&1; then
  echo "ERREUR: Java introuvable."
  echo '  export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"'
  exit 1
fi

echo "==> Java : $JAVA_HOME"

echo "==> Build App Bundle (release)"
./gradlew bundleRelease --no-daemon

if [ ! -f "$OUT" ]; then
  echo "ERREUR: AAB introuvable à $OUT"
  exit 1
fi

echo ""
echo "==> App Bundle prêt"
echo "  Fichier : $OUT"
echo "  Taille  : $(du -h "$OUT" | cut -f1)"
echo ""
echo "Upload Play Console → Production / Test → Créer une version → App bundles"
