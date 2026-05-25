#!/usr/bin/env bash
# Argus bootstrap — copies engine templates into $PWD so this directory
# becomes a working Argus install. Idempotent. Re-running overwrites the
# engine files (templates → live) but never touches your active topics,
# generated dispatch stubs, the skill itself, or runtime state.
#
# Usage:
#   bash .../.claude/skills/argus/scripts/bootstrap.sh [TARGET]
# If TARGET is omitted, uses $PWD.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATES="$SKILL_DIR/templates"
TARGET="${1:-$PWD}"
TARGET="$(cd "$TARGET" && pwd)"

# Refuse to bootstrap into the skill source itself or a parent of it.
case "$SKILL_DIR" in
  "$TARGET"|"$TARGET"/*) ;;
  *) ;;
esac
if [ "$TARGET" = "$SKILL_DIR" ] || [[ "$SKILL_DIR" == "$TARGET"/* ]] && [ "$TARGET" != "${SKILL_DIR%/.claude/skills/argus}" ]; then
  if [ "$TARGET" != "${SKILL_DIR%/.claude/skills/argus}" ]; then
    echo "Refusing to bootstrap into a directory above the skill source itself." >&2
    exit 1
  fi
fi

if [ ! -d "$TEMPLATES" ]; then
  echo "Templates directory not found at: $TEMPLATES" >&2
  echo "This skill installation appears broken." >&2
  exit 1
fi

echo "Argus bootstrap"
echo "  templates: $TEMPLATES"
echo "  target:    $TARGET"
echo ""

# ── .claude/ engine files ────────────────────────────────────────────────
mkdir -p "$TARGET/.claude/commands"
cp -f "$TEMPLATES/claude/loop.md"          "$TARGET/.claude/loop.md"
cp -f "$TEMPLATES/claude/loop-summary.md"  "$TARGET/.claude/loop-summary.md"
cp -f "$TEMPLATES/claude/commands/argus.md" "$TARGET/.claude/commands/argus.md"
echo "  + .claude/loop.md"
echo "  + .claude/loop-summary.md"
echo "  + .claude/commands/argus.md"

# ── app/ source (preserve user's node_modules / dist / public/topics) ────
mkdir -p "$TARGET/app"
RSYNC_EXCLUDES=(
  --exclude='node_modules'
  --exclude='dist'
  # public/ holds sync-data output — don't overwrite user's generated assets,
  # but do create public/.gitkeep so the dir exists on a fresh install.
  --exclude='public/research_scout'
  --exclude='public/topics'
  --exclude='*.tsbuildinfo'
  --exclude='vite.config.d.ts'
  --exclude='vite.config.js'
)
if command -v rsync >/dev/null 2>&1; then
  rsync -a "${RSYNC_EXCLUDES[@]}" "$TEMPLATES/app/" "$TARGET/app/"
else
  # Fallback: cp -R (will not preserve excludes; manually clean afterwards)
  cp -R "$TEMPLATES/app/." "$TARGET/app/"
  rm -rf \
    "$TARGET/app/node_modules" \
    "$TARGET/app/dist" \
    "$TARGET/app/public/topics" \
    "$TARGET/app"/*.tsbuildinfo \
    "$TARGET/app/vite.config.d.ts" \
    "$TARGET/app/vite.config.js" 2>/dev/null || true
fi
echo "  + app/ (config, src, scripts, public/.gitkeep; node_modules excluded)"

# ── topics/ directory placeholder (so /argus init has somewhere to write) ─
mkdir -p "$TARGET/topics"

# ── Done. Tell the user what to do next. ─────────────────────────────────
cat <<'EOF'

Bootstrap complete.

Next steps:
  1. In a Claude Code session opened at this directory, run:
       /argus init "<your topic in one line>"
     (Argus will ask 3-5 clarifying questions, then auto-accept.)

  2. After /argus init finishes:
       /argus loop <slug>

  3. To watch in the dashboard (one-time install):
       cd app && npm install && npm run dev
     then open http://localhost:5173/t/<slug>

This bootstrap is idempotent. To pull in updated engine logic from the
skill at any time, re-run this script — your topics/ and .claude/loops/
are preserved.
EOF
