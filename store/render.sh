#!/bin/sh
# Render store/art.html variants to store/assets/*.png with headless Chrome (or Edge / Brave).
# Headless Brave can hang on macOS; Chrome and Edge work.
# Usage: ./store/render.sh   (set CHROME=/path/to/browser to pick one)
set -e
cd "$(dirname "$0")/.."
for c in "$CHROME" \
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" \
  "$(command -v google-chrome || true)" "$(command -v chromium || true)"; do
  [ -n "$c" ] && [ -x "$c" ] && CHROME="$c" && break
done
[ -x "$CHROME" ] || { echo "No Chromium browser found; set CHROME=" >&2; exit 1; }

PORT=${PORT:-8766}
python3 -m http.server "$PORT" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT
sleep 1

mkdir -p store/assets
PROFILE=$(mktemp -d)
shot() { # name variant width height
  "$CHROME" --headless=new --hide-scrollbars --force-dark-mode --no-first-run \
    --user-data-dir="$PROFILE" --timeout=2500 --window-size="$3,$4" \
    --screenshot="$PWD/store/assets/$1.png" "http://localhost:$PORT/store/art.html?v=$2" 2>/dev/null
  echo "wrote store/assets/$1.png"
}
shot screenshot-1 shot1 1280 800
shot screenshot-2 shot2 1280 800
shot promo-small small 440 280
shot promo-marquee marquee 1400 560
rm -rf "$PROFILE"
