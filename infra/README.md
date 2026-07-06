# Dynime OS — Supabase → Cloudflare Migration

This directory contains everything needed to move Dynime OS off Supabase and onto
**our own Postgres fronted by Cloudflare** (Hyperdrive + Workers + R2 + CDN).

It is organized by the same phases as the approved migration plan. Each phase ships
independently and the app keeps working throughout — nothing here changes the running
app until you explicitly run the cutover (Phase 6).

```
infra/
  postgres/     Phase 2 — recreate the schema on our own Postgres (+ auth.uid() compat shims)
  cloudflare/   Phase 2 — Hyperdrive + R2 + KV + Workers bindings (wrangler.toml, .dev.vars)
  migrate/      Phase 3 — export Supabase data + objects, import into Postgres/R2, verify
  workers/      Phase 4–6 — auth service, functions gateway, data API, R2 proxy, realtime DO, cron
  frontend/     Phase 4–6 — drop-in adapters: auth, functions invoke, realtime (mirror supabase.*)
  CUTOVER.md    Phase 6 — the staged cutover runbook + rollback
```

All scaffolding is written and self-consistent. What remains is **execution**, which
needs the external credentials below + porting the remaining 69 functions
(`workers/PORTING_CHECKLIST.md`). Nothing here touches the running app until cutover.

## What you must provide (cannot be automated from this repo)

| # | Secret / resource | Where to get it | Used by |
|---|-------------------|-----------------|---------|
| 1 | **Supabase DB password** (or a direct connection string) | Supabase Dashboard → Project Settings → Database | `migrate/export-supabase.sh` |
| 2 | **Supabase service-role key** | Dashboard → Project Settings → API | `migrate/migrate-storage-to-r2.ts` (list buckets/objects) |
| 3 | **Target Postgres** (Neon / RDS / self-host) connection string | Your DB provider | everything |
| 4 | **Cloudflare account** with Workers Paid, Hyperdrive, R2 enabled | dash.cloudflare.com | Phases 2,4,5,6 |
| 5 | Cloudflare **API token** (Workers + Hyperdrive + R2 edit) | dash → My Profile → API Tokens | `wrangler` |

> The repo only contains the Supabase **anon** key. The anon key cannot dump data or
> list storage — items (1) and (2) above are hard blockers for Phase 3.

## Order of operations

1. **Phase 2** — `postgres/` then `cloudflare/`: stand up the empty schema + Hyperdrive.
2. **Phase 3** — `migrate/`: copy data and storage objects. Verify row counts.
3. **Phase 4** — `workers/` (auth): deploy auth, migrate `auth.users`, flip the frontend auth adapter.
4. **Phase 5** — `workers/` (functions): port the 70 edge functions (`PORTING_CHECKLIST.md`), point the `invokeFunction` shim at the gateway.
5. **Phase 6** — `CUTOVER.md`: flip the `VITE_USE_WORKERS*` flags, deploy the realtime DO, DNS cutover. Keep Supabase read-only as rollback.

Each subdirectory has its own README with exact commands.
