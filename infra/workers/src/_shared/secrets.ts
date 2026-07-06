// Phase 5 — DB-driven secrets. Edge functions never read provider creds from env;
// they read them from tables. This preserves that model on Workers.
//
// Tables (per the migration plan):
//   platform_settings        key/value JSON (global config, e.g. ai_config)
//   payment_gateway_configs   per-gateway Stripe/Razorpay/etc. creds
//   tenant_integrations       per-tenant integration creds (SMS, WhatsApp, ...)
//   pdm_courier_configs       courier/POS creds
//   webhook_configs           outbound webhook endpoints/secrets
//
// All reads go through the service-role context (these are server-only secrets).

import type postgres from "postgres";
import { connect, withSession, SERVICE } from "./db";
import type { Env } from "./env";

export type Sql = ReturnType<typeof connect>;

// platform_settings.value for a key (e.g. "ai_config").
export async function getPlatformSetting<T = Record<string, unknown>>(
  sql: Sql, key: string,
): Promise<T | null> {
  const rows = await withSession(sql, SERVICE, (tx) =>
    tx`SELECT value FROM public.platform_settings WHERE key = ${key} LIMIT 1`);
  return (rows[0]?.value as T) ?? null;
}

// Gateway creds (optionally tenant-scoped if the table has tenant_id).
export async function getPaymentGatewayConfig(
  sql: Sql, gateway: string, tenantId?: string | null,
): Promise<Record<string, unknown> | null> {
  const rows = await withSession(sql, SERVICE, (tx) =>
    tenantId
      ? tx`SELECT * FROM public.payment_gateway_configs
           WHERE gateway = ${gateway} AND tenant_id = ${tenantId} LIMIT 1`
      : tx`SELECT * FROM public.payment_gateway_configs
           WHERE gateway = ${gateway} LIMIT 1`);
  return (rows[0] as Record<string, unknown>) ?? null;
}

// Per-tenant integration creds (sms, whatsapp, google_calendar, ...).
export async function getTenantIntegration(
  sql: Sql, tenantId: string, integration: string,
): Promise<Record<string, unknown> | null> {
  const rows = await withSession(sql, SERVICE, (tx) =>
    tx`SELECT * FROM public.tenant_integrations
       WHERE tenant_id = ${tenantId} AND integration = ${integration} LIMIT 1`);
  return (rows[0] as Record<string, unknown>) ?? null;
}

export async function getCourierConfig(
  sql: Sql, tenantId: string, courier: string,
): Promise<Record<string, unknown> | null> {
  const rows = await withSession(sql, SERVICE, (tx) =>
    tx`SELECT * FROM public.pdm_courier_configs
       WHERE tenant_id = ${tenantId} AND courier = ${courier} LIMIT 1`);
  return (rows[0] as Record<string, unknown>) ?? null;
}

export async function getWebhookConfigs(
  sql: Sql, tenantId: string, event?: string,
): Promise<Record<string, unknown>[]> {
  const rows = await withSession(sql, SERVICE, (tx) =>
    event
      ? tx`SELECT * FROM public.webhook_configs
           WHERE tenant_id = ${tenantId} AND ${event} = ANY(events) AND active = true`
      : tx`SELECT * FROM public.webhook_configs
           WHERE tenant_id = ${tenantId} AND active = true`);
  return rows as unknown as Record<string, unknown>[];
}

// Env fallback: some creds may still live in Worker secrets during migration.
export function envOr(env: Env, key: keyof Env, fallback = ""): string {
  return (env[key] as string) || fallback;
}
