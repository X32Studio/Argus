#!/usr/bin/env bash
# Refresh only the app/ source from templates. Does not touch .claude/ or
# topics/. Useful when the dashboard code has changed but you don't want
# to disturb engine logic that might be mid-iteration.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATES="$SKILL_DIR/templates"
TARGET="${1:-$PWD}"
TARGET="$(cd "$TARGET" && pwd)"

if [ ! -d "$TEMPLATES/app" ]; then
  echo "Templates app/ not found at: $TEMPLATES/app" >&2
  exit 1
fi

echo "Refreshing $TARGET/app/ from $TEMPLATES/app/"

mkdir -p "$TARGET/app"
if command -v rsync >/dev/null 2>&1; then
  rsync -a \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='public/research_scout' \
    --exclude='public/topics' \
    --exclude='*.tsbuildinfo' \
    --exclude='vite.config.d.ts' \
    --exclude='vite.config.js' \
    "$TEMPLATES/app/" "$TARGET/app/"
else
  cp -R "$TEMPLATES/app/." "$TARGET/app/"
fi

echo "Done."
