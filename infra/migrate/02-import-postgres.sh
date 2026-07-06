#!/usr/bin/env bash
# Phase 3 — Load the Supabase dumps into our target Postgres.
# Assumes schema is already present (restore dumps/schema.sql, or apply-migrations.sh).
# Requires: TARGET_DATABASE_URL
set -euo pipefail

: "${TARGET_DATABASE_URL:?Set TARGET_DATABASE_URL (our new Postgres)}"
OUT="$(dirname "$0")/dumps"
[ -f "$OUT/data.sql" ] || { echo "Missing $OUT/data.sql — run ./01-export-supabase.sh first"; exit 1; }

echo "==> 1/3 auth.users (load before public.* so FKs to auth.users resolve)"
if [ -f "$OUT/auth_users.csv" ]; then
  psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -c "\copy auth.users ( \
    id, email, phone, encrypted_password, email_confirmed_at, phone_confirmed_at, \
    raw_user_meta_data, raw_app_meta_data, created_at, updated_at, last_sign_in_at, \
    banned_until, deleted_at \
  ) FROM '$OUT/auth_users.csv' WITH CSV HEADER"
else
  echo "   (no auth_users.csv — skipping)"
fi

echo "==> 2/3 public data (FK ordering handled without superuser)"
# Managed Postgres (Neon/RDS) blocks BOTH ways pg_dump defers FK checks:
#   - "ALTER TABLE ... DISABLE TRIGGER ALL"  (needs superuser)
#   - "SET session_replication_role = replica" (rejected even for the table owner on Neon)
# So we do it the portable way: capture FK constraints, DROP them, load data with FK
# checks off-by-absence, then RE-ADD them (which also validates referential integrity).
# pg_dump 18 also emits "\restrict <token>" psql meta-commands the server rejects in -f
# over the pooler — strip those too.
CLEAN="$OUT/data-clean.sql"
grep -vE '^\\(restrict|unrestrict)|^ALTER TABLE .* (DISABLE|ENABLE) TRIGGER ALL;|session_replication_role' \
  "$OUT/data.sql" > "$CLEAN"

echo "    - capturing + dropping FK constraints"
psql "$TARGET_DATABASE_URL" -At -F'|' -c "
  SELECT conrelid::regclass::text, conname, pg_get_constraintdef(oid)
  FROM pg_constraint
  WHERE contype='f' AND connamespace='public'::regnamespace;" > "$OUT/fk_constraints.txt"
awk -F'|' '{print "ALTER TABLE "$1" DROP CONSTRAINT IF EXISTS \""$2"\";"}' "$OUT/fk_constraints.txt" > "$OUT/fk_drop.sql"
awk -F'|' '{print "ALTER TABLE "$1" ADD CONSTRAINT \""$2"\" "$3";"}'             "$OUT/fk_constraints.txt" > "$OUT/fk_add.sql"
psql "$TARGET_DATABASE_URL" -q -f "$OUT/fk_drop.sql"

echo "    - loading data (per-COPY, no wrapping txn so one bad COPY can't abort the rest)"
psql "$TARGET_DATABASE_URL" -f "$CLEAN"

echo "    - re-adding FK constraints (validates referential integrity)"
psql "$TARGET_DATABASE_URL" -f "$OUT/fk_add.sql"

echo "==> 3/3 Reset sequences to max(id) so new inserts don't collide"
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT s.relname AS seq, t.relname AS tbl, a.attname AS col
    FROM pg_class s
    JOIN pg_depend d ON d.objid = s.oid AND d.deptype = 'a'
    JOIN pg_class t ON t.oid = d.refobjid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE s.relkind = 'S' AND n.nspname = 'public'
  LOOP
    EXECUTE format(
      'SELECT setval(%L, COALESCE((SELECT MAX(%I) FROM public.%I), 1))',
      r.seq, r.col, r.tbl);
  END LOOP;
END $$;
SQL

echo
echo "Done. Next: ../postgres/strip-supabase-isms.sh \"\$TARGET_DATABASE_URL\""
echo "Then:  node 03-migrate-storage-to-r2.mjs  &&  ./04-verify-row-counts.sh"
