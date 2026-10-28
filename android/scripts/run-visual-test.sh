#!/usr/bin/env bash
# À lancer depuis android/, pendant que l'émulateur de recette est encore actif.
set -u
set +e

mpp_capture_directory="${MPP_ANDROID_CAPTURE_DIR:-${RUNNER_TEMP:-$PWD/app/build}/mpp-android-captures}"

./gradlew --no-daemon :app:connectedDebugAndroidTest \
  -Pandroid.testInstrumentationRunnerArguments.class=ci.monprofperso.app.VisualRegressionTest
mpp_test_status=$?

# Même si une assertion échoue, récupérer la capture d'échec avant l'arrêt de l'émulateur.
adb pull /sdcard/Android/data/ci.monprofperso.app.dev/files/visual-proof "$mpp_capture_directory"
mpp_capture_status=$?

if [ "$mpp_test_status" -ne 0 ]; then
  exit "$mpp_test_status"
fi
exit "$mpp_capture_status"
