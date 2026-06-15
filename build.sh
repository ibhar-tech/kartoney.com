#!/usr/bin/env bash
# Kartoney build helper.
#   ./build.sh          → install deps (if needed) + build into dist/
#   ./build.sh --serve  → build, then preview at http://localhost:8080
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "📦 Installing dependencies…"
  npm install --no-audit --no-fund
fi

echo "🔨 Building…"
npm run build

if [ "${1:-}" = "--serve" ]; then
  echo "▶  Starting preview…"
  npm run serve
fi
