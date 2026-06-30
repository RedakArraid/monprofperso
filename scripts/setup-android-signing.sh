#!/usr/bin/env bash
# Crée le keystore upload + keystore.properties (une fois).
# Usage : ./scripts/setup-android-signing.sh
# Mot de passe : saisi au clavier, ou variable KEYSTORE_PASSWORD.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID="$ROOT/android"
SECRETS="$ANDROID/secrets"
JKS="$SECRETS/monprofperso-upload.jks"
PROPS="$ANDROID/keystore.properties"

# shellcheck source=android-env.sh
source "$ROOT/scripts/android-env.sh"

if [ -z "${JAVA_HOME:-}" ] || ! command -v keytool >/dev/null 2>&1; then
  echo "ERREUR: Java introuvable."
  echo "  Installez Android Studio, ou exportez JAVA_HOME vers un JDK 17+."
  echo "  Exemple macOS :"
  echo '    export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"'
  exit 1
fi

echo "==> Java : $JAVA_HOME"
mkdir -p "$SECRETS"

if [ -f "$JKS" ] && [ -f "$PROPS" ]; then
  echo "Keystore et keystore.properties existent déjà."
  echo "  $JKS"
  echo "  $PROPS"
  exit 0
fi

if [ -z "${KEYSTORE_PASSWORD:-}" ]; then
  echo ""
  echo "Choisissez un mot de passe pour le keystore upload (min. 8 caractères)."
  echo "Conservez-le : nécessaire pour chaque release Play Store."
  read -r -s -p "Mot de passe keystore : " KEYSTORE_PASSWORD
  echo ""
  read -r -s -p "Confirmer : " KEYSTORE_PASSWORD_CONFIRM
  echo ""
  if [ "$KEYSTORE_PASSWORD" != "$KEYSTORE_PASSWORD_CONFIRM" ]; then
    echo "ERREUR: les mots de passe ne correspondent pas."
    exit 1
  fi
  if [ "${#KEYSTORE_PASSWORD}" -lt 8 ]; then
    echo "ERREUR: mot de passe trop court (min. 8 caractères)."
    exit 1
  fi
fi

if [ ! -f "$JKS" ]; then
  echo "==> Création du keystore upload"
  keytool -genkeypair -v \
    -keystore "$JKS" \
    -alias upload \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$KEYSTORE_PASSWORD" \
    -keypass "$KEYSTORE_PASSWORD" \
    -dname "CN=Mon Prof Perso, OU=Mobile, O=Mon Prof Perso, L=Abidjan, ST=Lagunes, C=CI"
  echo "  OK : $JKS"
fi

if [ ! -f "$PROPS" ]; then
  cat > "$PROPS" <<EOF
storeFile=secrets/monprofperso-upload.jks
storePassword=$KEYSTORE_PASSWORD
keyAlias=upload
keyPassword=$KEYSTORE_PASSWORD
EOF
  chmod 600 "$PROPS"
  echo "  OK : $PROPS"
fi

echo ""
echo "Signature Android prête. Lancez : ./scripts/build-android-bundle.sh"
