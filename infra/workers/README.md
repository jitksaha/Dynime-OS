# Dynime Workers — the Cloudflare replacement for Supabase

One Worker (`src/index.ts`) routes everything that used to be Supabase:

```
src/
  index.ts            router + Durable Object export + scheduled() (cron)
  cron.ts             pg_cron replacement dispatcher
  _shared/
    env.ts            Env bindings type (matches ../cloudflare/wrangler.toml)
    cors.ts           shared CORS + json()/error() (replaces per-function blocks)
    db.ts             Hyperdrive Postgres + withSession() RLS bridge (auth.uid via GUC)
    jwt.ts            session JWT issue/verify + refresh tokens (KV)
    password.ts       bcrypt verify/hash (migrated Supabase hashes work as-is)
    auth-context.ts   request -> SessionContext (anon/authenticated/service_role)
    secrets.ts        DB-driven secrets (platform_settings, *_configs, tenant_integrations)
    email.ts          MailChannels/Resend/Postmark (replaces npm:nodemailer)
  auth/               Phase 4: /auth/* — login, signup, refresh, user, recover, OAuth
    index.ts, oauth.ts
  functions/          Phase 5: /functions/<name>
    gateway.ts        registry + router (501 for not-yet-ported)
    ai-proxy.ts       worked example / porting template
  data/rest.ts        Phase 6: /rest/v1 PostgREST-compatible data API
  storage/r2.ts       Phase 6: /storage/<bucket>/<path> over R2
  realtime/channel.ts Phase 6: Durable Object WebSocket (publishChange helper)
```

## Run locally

```bash
cd infra/workers
npm install
cp ../cloudflare/.dev.vars.example ../cloudflare/.dev.vars   # fill in
npm run dev            # wrangler dev (uses WRANGLER_HYPERDRIVE_LOCAL for PG)
npm run typecheck
```

## Deploy

```bash
npm run deploy            # production
npm run deploy:staging    # staging env
```

Account setup (Hyperdrive/R2/KV creation, secrets) is in `../cloudflare/README.md`.

## How RLS still works off Supabase

`db.ts#withSession` opens a transaction and runs `set_config('app.user_id', ...)` etc.
before your query. The compat shims (`../postgres/02-compat-shims.sql`) define
`auth.uid()/role()/jwt()` to read those GUCs — so the ~172 migrations and every RLS
policy keep working unchanged. The auth Worker issues the JWT whose claims populate them.

## Porting the remaining 69 functions

Follow `PORTING_CHECKLIST.md`. Copy `functions/ai-proxy.ts`'s structure, register the
handler in `functions/gateway.ts`, and reuse `_shared/*`. The frontend keeps calling
`invokeFunction('<name>')` (infra/frontend/invoke-shim.ts) — no call-site changes.
