
-- OAuth2 Applications (registered clients)
CREATE TABLE public.oauth_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  app_name text NOT NULL,
  app_description text,
  app_icon_url text,
  client_id text NOT NULL UNIQUE DEFAULT 'dyn_' || encode(gen_random_bytes(16), 'hex'),
  client_secret_hash text NOT NULL,
  redirect_uris text[] NOT NULL DEFAULT '{}',
  scopes text[] NOT NULL DEFAULT '{openid,profile,email}',
  app_type text NOT NULL DEFAULT 'web' CHECK (app_type IN ('web', 'native', 'spa')),
  is_active boolean NOT NULL DEFAULT true,
  is_first_party boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.oauth_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant apps" ON public.oauth_applications
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can manage own tenant apps" ON public.oauth_applications
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- OAuth2 Authorization Codes (short-lived)
CREATE TABLE public.oauth_authorization_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  client_id text NOT NULL,
  user_id uuid NOT NULL,
  redirect_uri text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{openid}',
  code_challenge text,
  code_challenge_method text DEFAULT 'S256',
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.oauth_authorization_codes ENABLE ROW LEVEL SECURITY;

-- No direct client access - managed by edge functions only

-- OAuth2 Access Tokens
CREATE TABLE public.oauth_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  client_id text NOT NULL,
  user_id uuid NOT NULL,
  scopes text[] NOT NULL DEFAULT '{openid}',
  expires_at timestamptz NOT NULL,
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.oauth_access_tokens ENABLE ROW LEVEL SECURITY;

-- OAuth2 Refresh Tokens
CREATE TABLE public.oauth_refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  access_token_id uuid REFERENCES public.oauth_access_tokens(id) ON DELETE CASCADE,
  client_id text NOT NULL,
  user_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.oauth_refresh_tokens ENABLE ROW LEVEL SECURITY;

-- User's connected apps (consent records)
CREATE TABLE public.oauth_user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{openid}',
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE(user_id, client_id)
);

ALTER TABLE public.oauth_user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consents" ON public.oauth_user_consents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can revoke own consents" ON public.oauth_user_consents
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
