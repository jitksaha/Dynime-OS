# Phase 3 — Export from Supabase, import into our Postgres + R2

This is the one-time data migration. It **requires credentials the repo does not
contain** (see ../README.md):

- `SUPABASE_DB_URL` — `postgres://postgres:<DB_PASSWORD>@db.<ref>.supabase.co:5432/postgres`
- `SUPABASE_SERVICE_ROLE_KEY` — to list/download Storage objects
- `TARGET_DATABASE_URL` — our new Postgres (Phase 2)

Set them once:

```bash
cp ../cloudflare/.dev.vars.example ./.env.migrate    # then edit
set -a; source ./.env.migrate; set +a
export TARGET_DATABASE_URL="postgres://USER:PASS@HOST:5432/dynime"
```

## Order of operations

```bash
# 1. Stand up schema on the target (Phase 2). Either restore the dumped schema...
./01-export-supabase.sh          # writes dumps/ (schema.sql, data.sql, auth_users.csv)
psql "$TARGET_DATABASE_URL" -f ../postgres/01-extensions.sql
psql "$TARGET_DATABASE_URL" -f ../postgres/02-compat-shims.sql
psql "$TARGET_DATABASE_URL" -f dumps/schema.sql        # restore real prod schema

# 2. Load the data.
./02-import-postgres.sh

# 3. Re-assert shims and neutralize Supabase-isms.
../postgres/strip-supabase-isms.sh "$TARGET_DATABASE_URL"

# 4. Migrate Storage objects -> R2 (preserves <bucket>/<path>).
#    Requires Node 18+ and the R2 S3 creds (see script header).
node 03-migrate-storage-to-r2.mjs

# 5. Verify row counts match source vs target.
./04-verify-row-counts.sh
```

## What about auth.users?

`01-export-supabase.sh` dumps `auth.users` (id, email, encrypted_password bcrypt
hash, metadata) to `dumps/auth_users.csv` separately. `02-import-postgres.sh`
loads it into the compat `auth.users` table so existing users keep their logins
(Phase 4 verifies the bcrypt hash on sign-in). Identities for OAuth users come
from `auth.identities` (also dumped).

## Rollback

Nothing here mutates Supabase — it is read-only against the source. Keep Supabase
live until the Phase 6 staging sign-off, then make it read-only as a fallback.
