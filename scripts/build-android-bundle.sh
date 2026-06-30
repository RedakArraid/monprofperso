#!/usr/bin/env bash
# Génère l'Android App Bundle (.aab) signé pour Google Play.
# Prérequis : JDK 17+, Android SDK, keystore.properties + fichier .jks
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID="$ROOT/android"
KEYSTORE_PROPS="$ANDROID/keystore.properties"
OUT="$ANDROID/app/build/outputs/bundle/release/app-release.aab"

cd "$ANDROID"

if [ ! -f keystore.properties ]; then
  echo "ERREUR: $KEYSTORE_PROPS manquant."
  echo ""
  echo "  1. Créer le keystore upload (une fois) :"
  echo "     mkdir -p secrets"
  echo "     keytool -genkey -v \\"
  echo "       -keystore secrets/monprofperso-upload.jks \\"
  echo "       -keyalg RSA -keysize 2048 -validity 10000 \\"
  echo "       -alias upload"
  echo ""
  echo "  2. Copier le modèle :"
  echo "     cp keystore.properties.example keystore.properties"
  echo "     # puis éditer storePassword / keyPassword"
  echo ""
  echo "  Voir docs/APP-BUNDLE-ANDROID.md"
  exit 1
fi

if [ -z "${JAVA_HOME:-}" ] && [ -d "/Applications/Android Studio.app/Contents/jbr/Contents/Home" ]; then
  export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
fi

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
