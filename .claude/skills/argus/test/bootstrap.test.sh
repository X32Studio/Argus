#!/usr/bin/env bash
# Verifies bootstrap.sh copies the workflow template into a fresh watch dir.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOOTSTRAP="$SCRIPT_DIR/../scripts/bootstrap.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

bash "$BOOTSTRAP" "$TMP" >/dev/null

fail=0
for f in .claude/loop.md .claude/loop-summary.md .claude/commands/argus.md .claude/workflows/argus-cycle.js; do
  if [ ! -f "$TMP/$f" ]; then echo "MISSING: $f"; fail=1; fi
done
if [ "$fail" -eq 0 ]; then echo "ok   - bootstrap copies workflows + engine files"; else echo "FAIL - bootstrap"; fi
exit "$fail"
