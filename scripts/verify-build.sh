#!/usr/bin/env sh
# Run from anywhere; resolves repo root.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "==> Hearth OS: lint + build (from $ROOT)"
npm run lint
npm run build
echo "==> OK. Full stack tests: start API (3001) + WunderGraph router (4000), then: npm test"
