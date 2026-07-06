-- Phase 2 — Extensions used by the Dynime schema.
-- Run once against the empty target database BEFORE loading the schema.
-- All are IF NOT EXISTS so this is safe to re-run.

-- Supabase installs most extensions into a dedicated "extensions" schema, and the
-- dumped schema references them qualified (e.g. extensions.gen_random_bytes). Recreate
-- that schema and put pgcrypto there so those references resolve unchanged.
CREATE SCHEMA IF NOT EXISTS extensions;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions; -- gen_random_uuid/bytes, digest, crypt
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- trigram search (CRM/global search)
CREATE EXTENSION IF NOT EXISTS "citext";      -- case-insensitive emails
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- The schema dump references extensions.gen_random_bytes. Since pgcrypto is installed
-- in the extensions schema above, those symbols (gen_random_bytes, gen_random_uuid,
-- digest) are already available as extensions.<name>. No wrapper needed.

-- Vector search for the knowledge base embeddings (kb-embed function).
-- Neon/RDS: enable "vector". If unavailable, the kb-embed feature degrades to keyword search.
CREATE EXTENSION IF NOT EXISTS "vector";

-- NOTE: Supabase-only extensions are intentionally NOT created here:
--   pg_net, pg_graphql, supabase_vault, pgsodium, pg_cron(*)
-- They live in Supabase's managed image. Anything that depended on them is handled by
-- Workers instead (HTTP from Workers replaces pg_net; cron replaced by Cloudflare Cron Triggers).
-- (*) If you used pg_cron, port those jobs to Cloudflare Cron Triggers — see workers/README.md.
