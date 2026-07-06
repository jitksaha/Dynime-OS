// Shared Postgres access over Hyperdrive, with the RLS session-context bridge.
//
// The compat shims (infra/postgres/02-compat-shims.sql) make auth.uid()/role()/jwt()
// read per-transaction GUCs. This module sets those GUCs with SET LOCAL inside a
// transaction so existing RLS policies see the right identity — exactly what
// Supabase did with the JWT, but driven by our own Worker-issued claims.

import postgres from "postgres";
import type { Env } from "./env";

export interface SessionContext {
  userId: string | null;        // -> app.user_id   (auth.uid())
  role: "anon" | "authenticated" | "service_role";
  email?: string | null;        // -> app.user_email (auth.email())
  claims?: Record<string, unknown>; // -> app.jwt_claims (auth.jwt())
}

export function connect(env: Env) {
  // In dev, WRANGLER_HYPERDRIVE_LOCAL points straight at PG; in prod use the Hyperdrive
  // binding. Fall back to a direct DATABASE_URL secret when Hyperdrive isn't provisioned yet.
  const connectionString =
    env.WRANGLER_HYPERDRIVE_LOCAL ||
    (env.HYPERDRIVE?.connectionString) ||
    (env as unknown as Record<string, string>).DATABASE_URL;
  if (!connectionString) throw new Error("No database connection configured (HYPERDRIVE or DATABASE_URL)");
  return postgres(connectionString, {
    max: 5, fetch_types: false, idle_timeout: 20,
  });
}

// Run `fn` inside a transaction with the RLS GUCs set for `ctx`.
// Every user-facing query MUST go through here so RLS is enforced.
export async function withSession<T>(
  sql: postgres.Sql,
  ctx: SessionContext,
  fn: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  // postgres.js types sql.begin as returning UnwrapPromiseArray<T>; our callback returns a
  // single value (not an array of queries), so the runtime value is T. Cast to keep callers honest.
  return sql.begin(async (tx) => {
    // set_config(..., true) = transaction-local, matching SET LOCAL semantics.
    await tx`SELECT set_config('app.user_id',   ${ctx.userId ?? ""}, true)`;
    await tx`SELECT set_config('app.user_role', ${ctx.role}, true)`;
    await tx`SELECT set_config('app.user_email', ${ctx.email ?? ""}, true)`;
    await tx`SELECT set_config('app.jwt_claims', ${ctx.claims ? JSON.stringify(ctx.claims) : ""}, true)`;
    return fn(tx);
  }) as Promise<T>;
}

// Convenience: an anonymous context (pre-login requests).
export const ANON: SessionContext = { userId: null, role: "anon" };

// Convenience: service-role context (bypasses RLS — use only for trusted server work).
export const SERVICE: SessionContext = { userId: null, role: "service_role" };
