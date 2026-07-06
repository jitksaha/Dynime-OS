# Phase 2 — Cloudflare setup (Hyperdrive, R2, Workers, Pages)

This directory holds the Cloudflare account-side config. The actual Worker source
lives in `../workers/` (Phases 4–6). Run these once, top to bottom.

## 0. Prerequisites

```bash
npm i -g wrangler
wrangler login            # or: export CLOUDFLARE_API_TOKEN=...
```

You need (see ../README.md): Cloudflare account id + an API token with
**Workers Scripts, Hyperdrive, R2, KV, Durable Objects** edit permissions.

## 1. Hyperdrive (edge pooler in front of Postgres)

Provision your Postgres first (Phase 2 — Neon recommended), then:

```bash
wrangler hyperdrive create dynime-pg \
  --connection-string="postgres://USER:PASS@HOST:5432/dynime"
```

Copy the returned **id** into `wrangler.toml` → `[[hyperdrive]] id`.

## 2. R2 bucket (replaces Supabase Storage)

```bash
wrangler r2 bucket create dynime-storage
wrangler r2 bucket create dynime-storage-preview   # for `wrangler dev`
```

Optionally attach a custom domain (`storage.dynime.com`) in the R2 dashboard and
set it as `R2_PUBLIC_BASE` in `wrangler.toml`. Phase 3 uploads objects here.

## 3. KV namespace (sessions, nonces, rate limits, model cache)

```bash
wrangler kv namespace create dynime-cache
```

Copy the **id** into `wrangler.toml` → `[[kv_namespaces]] id`.

## 4. Secrets

```bash
cp .dev.vars.example .dev.vars      # fill in for local `wrangler dev`
# Production — set each secret in the dashboard or:
wrangler secret put JWT_SECRET
wrangler secret put SERVICE_ROLE_TOKEN
# ...repeat for each non-empty var in .dev.vars.example
```

## 5. Deploy the Worker (after Phases 4–6 source exists)

```bash
cd ../workers
wrangler deploy                      # production
wrangler deploy --env staging        # staging
```

## 6. Frontend on Cloudflare Pages

The Vite app deploys to Pages (separate from the Worker):

- **Build command:** `npm run build`
- **Build output dir:** `dist`
- **Env vars:** `VITE_API_BASE_URL=https://api.dynime.com` (the Worker route),
  plus any `VITE_*` the app needs. The old `VITE_SUPABASE_*` vars are removed in Phase 6.

Route the Worker at `api.dynime.com/*` and Pages at `dynime.com` so the SPA and
the API share a parent domain (simplifies cookies/CORS).

## What this replaces

| Supabase | Cloudflare |
|----------|-----------|
| Postgres (direct) | External Postgres + **Hyperdrive** |
| Storage | **R2** |
| Edge Functions (Deno) | **Workers** (functions gateway) |
| Auth | **Workers** auth service + JWT |
| Realtime (`postgres_changes`) | **Durable Objects** WebSocket |
| `pg_cron` | **Cron Triggers** |
| `pg_net` (`net.http_post`) | Worker `fetch` |
