#!/usr/bin/env bash
# Runs all Argus engine-development tests. Exits non-zero if any fail.
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
rc=0
echo "== argus-cycle harness =="
node "$SCRIPT_DIR/argus-cycle.harness.mjs" || rc=1
echo "== bootstrap test =="
bash "$SCRIPT_DIR/bootstrap.test.sh" || rc=1
echo ""
[ "$rc" -eq 0 ] && echo "ALL ARGUS TESTS PASSED" || echo "SOME ARGUS TESTS FAILED"
exit "$rc"
