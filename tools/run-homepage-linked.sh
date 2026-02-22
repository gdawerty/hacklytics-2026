#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_BASE="${FRONTEND_BASE:-http://localhost:8080}"
HOMEPAGE_PORT="${HOMEPAGE_PORT:-4173}"

cd "$ROOT/homepage"
npm run build >/dev/null

cd "$ROOT"
HOMEPAGE_PORT="$HOMEPAGE_PORT" FRONTEND_BASE="$FRONTEND_BASE" node tools/homepage-link-server.mjs
