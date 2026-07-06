#!/usr/bin/env bash
# Phase 3 — Verify every public table has the same row count in Supabase vs target.
# Requires: SUPABASE_DB_URL, TARGET_DATABASE_URL
set -euo pipefail

: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL}"
: "${TARGET_DATABASE_URL:?Set TARGET_DATABASE_URL}"

COUNT_SQL="SELECT relname, n_live_tup
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY relname;"

# n_live_tup is an estimate; for exact counts on suspect tables, re-run with COUNT(*).
tmp_src="$(mktemp)"; tmp_dst="$(mktemp)"
trap 'rm -f "$tmp_src" "$tmp_dst"' EXIT

psql "$SUPABASE_DB_URL"   -At -F'|' -c "$COUNT_SQL" | sort > "$tmp_src"
psql "$TARGET_DATABASE_URL" -At -F'|' -c "$COUNT_SQL" | sort > "$tmp_dst"

echo "table | supabase | target | status"
echo "------+----------+--------+-------"
mismatch=0
join -t'|' -a1 -a2 -e '—' -o '0,1.2,2.2' "$tmp_src" "$tmp_dst" | while IFS='|' read -r tbl src dst; do
  status="ok"
  [ "$src" != "$dst" ] && status="DIFF"
  printf "%s | %s | %s | %s\n" "$tbl" "$src" "$dst" "$status"
done

# Exact recheck hint
echo
echo "Note: counts above are planner estimates (pg_stat). For an exact check on any"
echo "table flagged DIFF, run:  psql \"\$URL\" -c 'SELECT count(*) FROM public.<table>'"
