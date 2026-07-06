#!/usr/bin/env bash
# Phase 3 — Export schema + data + auth from Supabase (read-only).
# Requires: SUPABASE_DB_URL (postgres://postgres:<DB_PASSWORD>@db.<ref>.supabase.co:5432/postgres)
# Produces: dumps/schema.sql, dumps/data.sql, dumps/auth_users.csv, dumps/auth_identities.csv
set -euo pipefail

: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL (needs the DB password from the Supabase dashboard)}"
OUT="$(dirname "$0")/dumps"
mkdir -p "$OUT"

echo "==> 1/4 Schema (public schema only, no owners/ACLs so it restores on vanilla PG)"
pg_dump "$SUPABASE_DB_URL" \
  --schema-only --no-owner --no-acl \
  --schema=public \
  -f "$OUT/schema.sql"

# pg_dump still emits "CREATE SCHEMA public" which fails on Neon (it already exists).
# Convert that to CREATE IF NOT EXISTS so ON_ERROR_STOP=1 doesn't trip.
awk '/^CREATE SCHEMA IF NOT EXISTS public/ {next}
     /^CREATE SCHEMA public/ && !/^--/ { print "CREATE SCHEMA IF NOT EXISTS public;"; next }
     { print }' "$OUT/schema.sql" > "$OUT/schema-neon.sql"
mv "$OUT/schema-neon.sql" "$OUT/schema.sql"

echo "==> 2/4 Data (public schema; --disable-triggers so FK order doesn't block COPY)"
pg_dump "$SUPABASE_DB_URL" \
  --data-only --no-owner --no-acl \
  --schema=public \
  --disable-triggers \
  -f "$OUT/data.sql"

echo "==> 3/4 auth.users (id, email, bcrypt hash, metadata) for login migration"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "\copy ( \
  SELECT id, email, phone, encrypted_password, email_confirmed_at, phone_confirmed_at, \
         raw_user_meta_data, raw_app_meta_data, created_at, updated_at, last_sign_in_at, \
         banned_until, deleted_at \
  FROM auth.users \
) TO '$OUT/auth_users.csv' WITH CSV HEADER"

echo "==> 4/4 auth.identities (OAuth provider links)"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "\copy ( \
  SELECT id, user_id, provider, identity_data, created_at, updated_at, last_sign_in_at \
  FROM auth.identities \
) TO '$OUT/auth_identities.csv' WITH CSV HEADER" || \
  echo "   (auth.identities not present or empty — skipping)"

echo
echo "Done. Dumps in $OUT:"
ls -lh "$OUT"
echo
echo "Next: restore schema, then ./02-import-postgres.sh"
