// Shared Env type for all Workers. Mirrors the bindings in ../../cloudflare/wrangler.toml
// and the secrets in .dev.vars.example.

export interface Env {
  // Bindings
  HYPERDRIVE: Hyperdrive;
  STORAGE: R2Bucket;
  CACHE: KVNamespace;
  REALTIME: DurableObjectNamespace;

  // Non-secret vars
  ENVIRONMENT: string;
  APP_URL: string;
  R2_PUBLIC_BASE: string;

  // Local dev override (wrangler dev): direct PG url, bypasses Hyperdrive.
  WRANGLER_HYPERDRIVE_LOCAL?: string;

  // Auth secrets
  JWT_SECRET: string;
  JWT_ISSUER: string;
  JWT_ACCESS_TTL: string;
  JWT_REFRESH_TTL: string;
  GOOGLE_OAUTH_CLIENT_ID?: string;
  GOOGLE_OAUTH_CLIENT_SECRET?: string;
  APPLE_OAUTH_CLIENT_ID?: string;
  APPLE_OAUTH_CLIENT_SECRET?: string;
  WEBAUTHN_RP_ID?: string;
  WEBAUTHN_RP_NAME?: string;
  WEBAUTHN_ORIGIN?: string;

  // Service role (privileged DB path)
  SERVICE_ROLE_TOKEN: string;

  // Email
  EMAIL_PROVIDER?: string;
  EMAIL_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_FROM_NAME?: string;
}
