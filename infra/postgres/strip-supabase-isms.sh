#!/usr/bin/env bash
# Phase 2 — Post-load cleanup so the schema runs off Supabase.
# The compat shims (02-compat-shims.sql) already provide auth.uid()/role()/jwt(),
# so RLS policies keep working. This script handles the remaining off-platform gaps.
#
# Usage: ./strip-supabase-isms.sh "postgres://user:pass@host:5432/dynime"
set -euo pipefail
TARGET_URL="${1:?Usage: strip-supabase-isms.sh <target-database-url>}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

psql "$TARGET_URL" -v ON_ERROR_STOP=1 <<SQL
-- 1. Re-assert compat functions (in case a dump dropped/recreated the auth schema).
\i ${SCRIPT_DIR}/02-compat-shims.sql

-- 2. Neutralize references to Supabase-managed schemas that won't exist here.
--    pg_net (net.http_post) was used by some triggers to call edge functions.
--    Off-platform, those calls are made by Workers instead. Create a no-op net schema
--    so any leftover trigger doesn't hard-fail; log so you can port it to a Worker.
CREATE SCHEMA IF NOT EXISTS net;
CREATE OR REPLACE FUNCTION net.http_post(url text, body jsonb DEFAULT '{}'::jsonb, params jsonb DEFAULT '{}'::jsonb, headers jsonb DEFAULT '{}'::jsonb, timeout_milliseconds int DEFAULT 5000)
RETURNS bigint LANGUAGE plpgsql AS $$
BEGIN
  RAISE WARNING 'net.http_post() is a no-op off Supabase. Port this call to a Worker: %', url;
  RETURN 0;
END $$;

-- 3. storage.* schema: object metadata now lives in R2. If the dump created
--    storage.objects/buckets, keep them as plain tables (harmless) but the app reads R2.
SQL

echo "Compat shims re-applied. Review any WARNING about net.http_post — those triggers"
echo "need to be reimplemented as Cloudflare Workers (Phase 5)."
