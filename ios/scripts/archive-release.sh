#!/usr/bin/env bash
set -euo pipefail

ios_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ios_root"

: "${MPP_IOS_TEAM_ID:?Configurer l’identifiant de l’équipe Apple Developer dans MPP_IOS_TEAM_ID.}"
if [[ ! "$MPP_IOS_TEAM_ID" =~ ^[A-Z0-9]{10}$ ]]; then
  printf '%s\n' 'MPP_IOS_TEAM_ID doit contenir les 10 caractères de votre équipe Apple.' >&2
  exit 1
fi
command -v xcodegen >/dev/null
command -v xcodebuild >/dev/null

release_api="${MPP_IOS_API_URL:-https://api.monprofperso.com}"
python3 - "$release_api" <<'PY'
from urllib.parse import urlsplit
import sys
url=urlsplit(sys.argv[1])
if url.scheme!='https' or not url.hostname or url.username or url.password or url.query or url.fragment:
    raise SystemExit('MPP_IOS_API_URL doit être une URL HTTPS sans identifiants, requête ou fragment.')
PY

archive_path="$ios_root/build/MonProfPerso.xcarchive"
export_path="$ios_root/build/export"
mkdir -p "$ios_root/build"
options_file="$(mktemp "$ios_root/build/export-options.XXXXXX.plist")"
trap 'rm -f "$options_file"' EXIT

python3 - "$options_file" "$MPP_IOS_TEAM_ID" <<'PY'
import plistlib,sys
with open(sys.argv[1],'wb') as f:
    plistlib.dump({'method':'app-store-connect','teamID':sys.argv[2],'signingStyle':'automatic','uploadSymbols':True,'manageAppVersionAndBuildNumber':False},f)
PY

xcodegen generate
xcodebuild archive -project MonProfPerso.xcodeproj -scheme MonProfPerso \
  -configuration Release -destination 'generic/platform=iOS' \
  -archivePath "$archive_path" \
  DEVELOPMENT_TEAM="$MPP_IOS_TEAM_ID" API_BASE_URL="$release_api" \
  MARKETING_VERSION="${MPP_IOS_VERSION_NAME:-1.1.0}" CURRENT_PROJECT_VERSION="${MPP_IOS_BUILD_NUMBER:-3}" \
  CODE_SIGN_STYLE=Automatic
xcodebuild -exportArchive -archivePath "$archive_path" \
  -exportPath "$export_path" -exportOptionsPlist "$options_file"

printf '%s\n' "Archive signée : $archive_path" "Export local : $export_path"
printf '%s\n' 'Aucun téléversement vers App Store Connect n’a été effectué.'
