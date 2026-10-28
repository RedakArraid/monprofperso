#!/usr/bin/env bash
# La collecte UTP précède le nettoyage des APK et des données sur l'émulateur.
set -u
set +e

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." || exit 1
mpp_capture_directory="${MPP_ANDROID_CAPTURE_DIR:-${RUNNER_TEMP:-$PWD/app/build}/mpp-android-captures}"
mpp_native_outputs="app/build/outputs/connected_android_test_additional_output/debugAndroidTest"

# Effacer seulement les sorties régénérables de cette variante, jamais les archives de preuve.
rm -rf -- "$mpp_native_outputs" || exit 1

./gradlew --no-daemon :app:connectedDebugAndroidTest \
  -Pandroid.enableAdditionalTestOutput=true \
  -Pandroid.testInstrumentationRunnerArguments.class=ci.monprofperso.app.VisualRegressionTest
mpp_test_status=$?

# UTP a déjà rapatrié les fichiers avant de désinstaller les APK, même en cas d'assertion échouée.
mpp_capture_status=1
if [ -d "$mpp_native_outputs" ]; then
  if find "$mpp_native_outputs" -type f -name '*.png' -print -quit | read -r mpp_first_capture; then
    if mkdir -p "$mpp_capture_directory"; then
      if mpp_capture_run="$(mktemp -d "$mpp_capture_directory/run.XXXXXX")"; then
        cp -R "$mpp_native_outputs/." "$mpp_capture_run/"
        mpp_capture_status=$?
      fi
    fi
  fi
fi
if [ "$mpp_capture_status" -ne 0 ]; then
  printf '%s\n' 'Aucune preuve PNG récupérée par UTP, ou copie des preuves impossible.' >&2
fi

if [ "$mpp_test_status" -ne 0 ]; then
  exit "$mpp_test_status"
fi
exit "$mpp_capture_status"
