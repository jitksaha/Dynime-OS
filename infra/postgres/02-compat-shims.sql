-- Phase 2 — Supabase compatibility shims.
-- Lets the existing schema + RLS policies (which call auth.uid(), auth.role(), auth.jwt())
-- run on a vanilla Postgres without editing every policy.
--
-- Our Workers set these GUCs per request (over Hyperdrive) right after authenticating:
--   SET LOCAL app.user_id   = '<uuid>';
--   SET LOCAL app.user_role = 'authenticated';   -- or 'anon' / 'service_role'
--   SET LOCAL app.jwt_claims = '<json>';
-- Then run the user's query in the same transaction so RLS sees the right identity.

CREATE SCHEMA IF NOT EXISTS auth;

-- auth.uid(): current authenticated user id, or NULL when anonymous.
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::uuid
$$;

-- auth.role(): 'authenticated' | 'anon' | 'service_role'
CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('app.user_role', true), ''), 'anon')
$$;

-- auth.email(): convenience accessor some policies use.
CREATE OR REPLACE FUNCTION auth.email()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(current_setting('app.user_email', true), '')
$$;

-- auth.jwt(): full claims object, for policies that read custom claims.
CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS jsonb
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('app.jwt_claims', true), '')::jsonb, '{}'::jsonb)
$$;

-- Roles Supabase predefines and that GRANTs in the migrations may reference.
-- Create them as NOLOGIN so GRANT statements in the dump don't error.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOINHERIT LOGIN;
  END IF;
END
$$;

GRANT anon, authenticated, service_role TO authenticator;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

-- Minimal auth.users table so FKs from public.* (e.g. profiles.id -> auth.users.id)
-- restore cleanly. Phase 3 loads the real rows from the Supabase auth.users export.
CREATE TABLE IF NOT EXISTS auth.users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         citext UNIQUE,
  phone         text UNIQUE,
  encrypted_password text,
  email_confirmed_at timestamptz,
  phone_confirmed_at timestamptz,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  raw_app_meta_data  jsonb DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  last_sign_in_at timestamptz,
  banned_until  timestamptz,
  deleted_at    timestamptz
);

GRANT SELECT ON auth.users TO authenticated, service_role;

-- auth.identities — OAuth provider links (Google/Apple). Phase 3 loads the export;
-- Phase 4's oauth.ts upserts into it on social sign-in.
CREATE TABLE IF NOT EXISTS auth.identities (
  id              text NOT NULL,            -- provider's subject id
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider        text NOT NULL,
  identity_data   jsonb DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  last_sign_in_at timestamptz,
  PRIMARY KEY (provider, id)
);

GRANT SELECT ON auth.identities TO authenticated, service_role;
