#!/usr/bin/env bash
# Serve out/ on the local network so Decky can "Install plugin from URL". Usage: scripts/serve.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo '<mac-ip>')"
echo "In Decky developer settings, install from URL: http://$IP:8765/game-glance.zip"
exec python3 -m http.server 8765 --directory "$ROOT/out"
