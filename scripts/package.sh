#!/usr/bin/env bash
# Build the plugin and package it for Decky's "Install plugin from ZIP/URL". Usage: scripts/package.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
pnpm build
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
PKG="$STAGE/game-glance"
mkdir -p "$PKG/py_modules" out
cp plugin.json package.json main.py LICENSE THIRD_PARTY_LICENSES.md "$PKG/"
cp -R dist "$PKG/dist"
rm -f "$PKG"/dist/*.map # debugging aid only (~7 MB, mostly icon sources); dist/ keeps it locally
cp -R py_modules/gameglance "$PKG/py_modules/gameglance"
find "$PKG" -name '__pycache__' -prune -exec rm -rf {} +
rm -f out/game-glance.zip
(cd "$STAGE" && zip -qr "$ROOT/out/game-glance.zip" game-glance)
unzip -l out/game-glance.zip
