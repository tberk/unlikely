#!/bin/sh
# Serve the mock likes page with the real content script mounted at /content.js.
cd "$(dirname "$0")" && ln -sf ../src/content.js content.js && exec python3 -m http.server "${PORT:-8765}"
