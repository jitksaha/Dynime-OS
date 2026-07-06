#!/usr/bin/env bash
# Phase 2 — Replay the Supabase migration files in order against the target Postgres.
# Use this only if you are NOT restoring the schema from a pg_dump (Phase 3 is preferred,
# because it reflects exactly what was applied in production).
#
# Usage: ./apply-migrations.sh "postgres://user:pass@host:5432/dynime"
set -euo pipefail

TARGET_URL="${1:?Usage: apply-migrations.sh <target-database-url>}"
MIG_DIR="$(cd "$(dirname "$0")/../../supabase/migrations" && pwd)"

echo "Applying extensions + compat shims first..."
psql "$TARGET_URL" -v ON_ERROR_STOP=1 -f "$(dirname "$0")/01-extensions.sql"
psql "$TARGET_URL" -v ON_ERROR_STOP=1 -f "$(dirname "$0")/02-compat-shims.sql"

echo "Replaying $(ls "$MIG_DIR"/*.sql | wc -l | tr -d ' ') migration files..."
for f in $(ls "$MIG_DIR"/*.sql | sort); do
  echo "  -> $(basename "$f")"
  # ON_ERROR_STOP off here on purpose: some early migrations reference Supabase-managed
  # objects. Review the log; most "already exists"/auth.* notices are benign post-shim.
  psql "$TARGET_URL" -f "$f" || echo "     (continued past error in $(basename "$f") — review log)"
done

echo "Done. Now run: ./strip-supabase-isms.sh \"$TARGET_URL\""
