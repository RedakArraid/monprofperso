#!/usr/bin/env bash
set -euo pipefail
if [ "$#" -ne 2 ]; then
  echo "Usage: $0 RESULT.xcresult OUTPUT_DIRECTORY" >&2
  exit 64
fi
mkdir -p "$2"
xcrun xcresulttool export attachments --path "$1" --output-path "$2"
python3 - "$2" <<'PY'
import json, pathlib, re, shutil, sys
root = pathlib.Path(sys.argv[1]).resolve()
images = list(root.rglob('*.png'))
if not images:
    raise SystemExit('Aucune capture PNG exportée depuis XCTest.')
named = root / 'named'
named.mkdir(exist_ok=True)
def visit(node):
    if isinstance(node, list):
        for child in node: visit(child)
    elif isinstance(node, dict):
        source_name = node.get('exportedFileName') or node.get('filename')
        label = node.get('suggestedHumanReadableName') or node.get('name')
        if isinstance(source_name, str) and isinstance(label, str):
            source = (root / source_name).resolve()
            if source.is_relative_to(root) and source.is_file() and source.suffix.lower() == '.png':
                safe = re.sub(r'[^a-zA-Z0-9._-]+', '-', label).strip('-')[:130]
                if safe:
                    target = named / (safe if safe.lower().endswith('.png') else safe + '.png')
                    if target.exists(): target = target.with_name(target.stem + '-' + source.stem[:8] + '.png')
                    shutil.copy2(source, target)
        for value in node.values(): visit(value)
for manifest in root.glob('*.json'):
    visit(json.loads(manifest.read_text()))
print(f'{len(images)} captures PNG exportées ; noms et contexte conservés dans les manifestes XCTest.')
PY
