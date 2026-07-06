# Phase 6 — Cutover runbook (Supabase → Cloudflare)

Do this only after Phases 2–5 are deployed to **staging** and smoke-tested. Keep
Supabase live and read-only as rollback until staging passes end-to-end.

## Frontend wiring (feature-flagged)

The app's data/auth/functions/realtime all funnel through four files. At cutover you
copy the adapters from `infra/frontend/` into `src/` and switch imports behind flags:

| Concern | Today | Cutover target | Flag |
|--------|-------|----------------|------|
| Auth | `supabase.auth.*` | `infra/frontend/auth-adapter.ts` → `src/integrations/auth/` | `VITE_USE_WORKERS_AUTH` |
| Functions | `supabase.functions.invoke` | `infra/frontend/invoke-shim.ts` → `src/integrations/functions/` | `VITE_USE_WORKERS_FUNCTIONS` |
| Realtime | `realtimeClient.channel()` | `infra/frontend/realtime-adapter.ts` → `src/integrations/realtime/` | `VITE_USE_WORKERS_REALTIME` |
| Data (`.from()`) | Supabase PostgREST | Same client, `rest` URL → `${VITE_API_BASE_URL}/rest/v1` | `VITE_USE_WORKERS` |

### Lowest-churn data path
Keep `@supabase/supabase-js` as the query builder but repoint it: when `VITE_USE_WORKERS`
is set, construct the client with our Worker's `/rest/v1` URL and pass the Worker JWT as
both `apikey` and `Authorization`. The `.from().select()/.insert()/...` call sites across
the app stay byte-for-byte identical (our `data/rest.ts` speaks the PostgREST subset they use).
Swap `client.ts`'s `auth`/`functions` properties for the adapters above.

### Env vars (Cloudflare Pages)
```
VITE_API_BASE_URL=https://api.dynime.com
VITE_USE_WORKERS=true
VITE_USE_WORKERS_AUTH=true
VITE_USE_WORKERS_FUNCTIONS=true
VITE_USE_WORKERS_REALTIME=true
# remove VITE_SUPABASE_* once fully cut over
```
On app load, call `captureOAuthRedirect()` (auth-adapter) once to absorb OAuth fragments.

## Order of operations (production)

1. **Freeze writes** on Supabase (maintenance banner) — short window.
2. Re-run `infra/migrate/01-export-supabase.sh` + `02-import-postgres.sh` for the final delta,
   then `03-migrate-storage-to-r2.mjs` and `04-verify-row-counts.sh`. Counts must match.
3. Point **Hyperdrive** at the now-current Postgres; `wrangler deploy` the Worker (prod).
4. Flip Pages env flags to the Workers adapters; deploy the frontend.
5. Smoke test on the prod domain: login (migrated password) → dashboard → a CRUD write →
   `ai-proxy` → one payment flow → live-chat realtime.
6. DNS: route `api.dynime.com` → Worker, `dynime.com` → Pages.
7. Make Supabase **read-only**. Keep for 1–2 weeks as rollback.

## Rollback
Flip the Pages flags back to Supabase and redeploy the frontend (Supabase still live,
read-only → set writable). Nothing in `infra/` mutates Supabase, so rollback is a config flip.

## Verification checklist (from the plan)
- [ ] `grep -ri "lovable" src supabase` clean (Phase 1) ✅
- [ ] Per-table row counts match (Phase 3)
- [ ] Existing user logs in with old password; OAuth + passkey; session refresh (Phase 4)
- [ ] One function per category green: `ai-proxy`, `stripe-checkout`, `sms-send`, `webhook-dispatch` (Phase 5)
- [ ] Live chat realtime delivers agent replies (Phase 6)
- [ ] Playwright suite + `npm test` pass against staging
```
