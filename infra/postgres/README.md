# Phase 2 — Stand up our own Postgres

Goal: an empty Postgres database with the full Dynime schema, ready for the Phase 3 data load.

The Supabase migrations in `../../supabase/migrations/*.sql` (172 files) are **plain Postgres**
and are the source of truth for the schema. They do, however, reference Supabase-only objects
(`auth.*`, `storage.*`, `auth.uid()`, Supabase roles) that don't exist on a vanilla Postgres.

## Steps

1. **Create the database** on your provider (Neon recommended for Cloudflare Hyperdrive).

   ```bash
   createdb dynime         # or use the provider console
   psql "$TARGET_DATABASE_URL" -f 01-extensions.sql
   psql "$TARGET_DATABASE_URL" -f 02-compat-shims.sql
   ```

2. **Load the schema.** Two options:

   - **(Recommended) Restore the schema from the Supabase dump** produced in Phase 3
     (`pg_dump --schema-only`). It already reflects the real, live schema including every
     migration that was actually applied. See `../migrate/`.

   - **Or replay the migration files** in order:

     ```bash
     ./apply-migrations.sh "$TARGET_DATABASE_URL"
     ```

3. **Neutralize Supabase-isms** so the schema works off-platform:

   ```bash
   ./strip-supabase-isms.sh "$TARGET_DATABASE_URL"
   ```

   This installs a compatibility `auth.uid()` / `auth.role()` backed by a per-request
   session GUC (`app.user_id`, `app.user_role`) that our Workers set on each connection —
   so existing RLS policies keep working unchanged. See `02-compat-shims.sql`.

## Why a compat shim instead of rewriting RLS

Hundreds of RLS policies call `auth.uid()`. Rather than edit every policy, we provide an
`auth` schema with `auth.uid()` that reads `current_setting('app.user_id', true)::uuid`.
The auth Worker (Phase 4) sets that GUC per request via Hyperdrive. This keeps the ~172
migrations and all policies intact. Once stable, policies can be migrated to a native
`app.current_user_id()` at leisure.
