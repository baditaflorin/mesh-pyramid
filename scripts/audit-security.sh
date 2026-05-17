#!/usr/bin/env bash
#
# audit-security.sh — programmatic security audit for this app's layer-1 stack.
#
# Two passes, both headless and GPU-free:
#
#   1. crypto invariants (vitest in jsdom) — runs the mesh-common shared suite
#      with this app's storagePrefix, captures evidence in a JSONL.
#   2. UI flow (playwright in chromium headless) — drives the moderator badge
#      with two peers and captures observable evidence.
#
# Then renders a markdown + JSON audit report into docs/, which is committed
# to GitHub Pages so anyone can read the latest pass/fail at:
#   https://baditaflorin.github.io/mesh-pyramid/security-audit.md
#
set -euo pipefail

APP_DIR="$(pwd)"
APP_NAME="$(basename "$APP_DIR")"
TMP="/tmp/mesh-audit-$APP_NAME"
mkdir -p "$TMP"
UNIT_LOG="$TMP/unit.jsonl"
E2E_LOG="$TMP/e2e.jsonl"

# --- pass 1: unit / crypto invariants ----------------------------------------
echo "==> [$APP_NAME] audit pass 1/2 — crypto invariants (vitest)"
(
  cd ../mesh-common
  MESH_AUDIT_FILE="$UNIT_LOG" npx vitest run tests/securityAudit.test.ts --reporter=dot
)

# --- pass 2: UI flow ---------------------------------------------------------
echo "==> [$APP_NAME] audit pass 2/2 — UI flow (playwright)"
MESH_AUDIT_FILE="$E2E_LOG" npx playwright test tests/e2e/security-audit.spec.ts --reporter=line

# --- render report -----------------------------------------------------------
echo "==> [$APP_NAME] rendering report"
APP_NAME="$APP_NAME" node ../mesh-common/scripts/render-security-audit.mjs \
  "$UNIT_LOG" docs "$E2E_LOG"

echo "==> [$APP_NAME] done — see docs/security-audit.md"
