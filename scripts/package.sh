#!/bin/sh
# Build the Chrome Web Store upload: dist/unlikely-<version>.zip with only what the extension needs.
set -e
cd "$(dirname "$0")/.."
VERSION=$(python3 -c 'import json; print(json.load(open("manifest.json"))["version"])')
OUT="dist/unlikely-$VERSION.zip"
mkdir -p dist
rm -f "$OUT"
zip -qrX "$OUT" manifest.json src icons -x '*.DS_Store'
echo "$OUT"
unzip -l "$OUT"
