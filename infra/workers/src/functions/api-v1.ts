// Ported from supabase/functions/api-v1/index.ts.
// Public Key-API REST surface: GET/POST/PUT/PATCH/DELETE over tenant-scoped tables
// using x-api-key auth (key_hash lookup). Rate limiting is per-key, in-memory.
// Postgres result shape uses postgres.js (returns arrays directly).

import type { Env } from "../_shared/env";
import { corsHeaders, json, error } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";
import type postgres from "postgres";

interface ResourceConfig {
  table: string;
  searchFields?: string[];
  filterKeys?: string[];
  immutableFields?: string[];
}

const RESOURCES: Record<string, ResourceConfig> = {
  deals: { table: "deals", searchFields: ["name", "email", "contact_name"], filterKeys: ["status", "stage", "priority", "source"] },
  employees: { table: "employees", searchFields: ["full_name", "email"], filterKeys: ["status", "department"] },
  invoices: { table: "invoices", searchFields: ["invoice_number", "client"], filterKeys: ["status"] },
  expenses: { table: "expenses", searchFields: ["description", "category"], filterKeys: ["status", "category"] },
  documents: { table: "documents", searchFields: ["name"], filterKeys: ["doc_type"] },
  campaigns: { table: "campaigns", searchFields: ["name"], filterKeys: ["status", "channel"] },
  "leave-requests": { table: "leave_requests", searchFields: ["employee_name"], filterKeys: ["status", "leave_type"] },
  attendance: { table: "attendance_records", searchFields: ["employee_name"], filterKeys: ["status", "attendance_type"] },
  departments: { table: "departments", searchFields: ["name"], filterKeys: [] },
  notifications: { table: "notifications", searchFields: ["title", "message"], filterKeys: ["type", "read"] },
  "job-postings": { table: "job_postings", searchFields: ["title", "department"], filterKeys: ["status", "department", "employment_type"] },
  "job-applications": { table: "job_applications", searchFields: ["applicant_name", "applicant_email"], filterKeys: ["status"] },
  "lead-follow-ups": { table: "lead_follow_ups", searchFields: ["notes"], filterKeys: ["status", "type"] },
  "email-templates": { table: "email_templates", searchFields: ["name", "subject_line"], filterKeys: ["category"] },
  "late-records": { table: "late_records", searchFields: ["employee_name"], filterKeys: ["excused"] },
  "approval-workflows": { table: "approval_workflows", searchFields: ["name"], filterKeys: ["module", "is_active"] },
  "kyc-verifications": { table: "kyc_verifications", searchFields: ["full_name", "document_number"], filterKeys: ["status", "document_type"] },
  "audit-logs": { table: "audit_logs", searchFields: ["action"], filterKeys: ["action", "module"] },
  budgets: { table: "budgets", searchFields: ["name", "category"], filterKeys: ["status", "period"] },
  "employee-loans": { table: "employee_loans", searchFields: ["employee_name"], filterKeys: ["status", "loan_type"] },
  "employee-warnings": { table: "employee_warnings", searchFields: ["employee_name", "reason"], filterKeys: ["status", "severity", "warning_type"] },
  meetings: { table: "meetings", searchFields: ["title", "description"], filterKeys: ["status", "provider", "meeting_type"] },
};

const SUB_RESOURCES: Record<string, Record<string, { table: string; foreignKey: string }>> = {
  deals: { "follow-ups": { table: "lead_follow_ups", foreignKey: "deal_id" } },
  invoices: { items: { table: "invoice_items", foreignKey: "invoice_id" } },
  "job-postings": { applications: { table: "job_applications", foreignKey: "job_id" } },
};

// Per-key rate limit state (module-level, survives across handler calls in a single
// isolate). One Worker instance = one map. High-traffic keys will need KV-backed counting.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

async function hashKey(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function checkRateLimit(keyId: string, limitPerMinute: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(keyId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(keyId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= limitPerMinute) return false;
  entry.count++;
  return true;
}

interface KeyRecord {
  id: string;
  tenant_id: string;
  scopes: string[];
  rate_limit_per_minute: number;
  created_by: string;
  expires_at: string | null;
}

async function authenticateRequest(sql: postgres.Sql, req: Request): Promise<{ keyRecord: KeyRecord } | { error: Response }> {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return { error: error("Missing X-API-Key header", 401) };

  const keyHash = await hashKey(apiKey);
  const rows = await withSession(sql, SERVICE, (tx) =>
    tx`SELECT * FROM public.api_keys WHERE key_hash = ${keyHash} AND is_active = true LIMIT 1`);
  const keyRecord = rows[0] as KeyRecord | undefined;
  if (!keyRecord) return { error: error("Invalid API key", 401) };
  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
    return { error: error("API key expired", 401) };
  }
  if (!checkRateLimit(keyRecord.id, keyRecord.rate_limit_per_minute)) {
    return { error: error("Rate limit exceeded", 429, { retry_after_seconds: 60, limit: keyRecord.rate_limit_per_minute }) };
  }
  return { keyRecord };
}

function checkScopes(scopes: string[], method: string, resource: string): Response | null {
  const readScopes = ["read", "read:all", `read:${resource}`];
  const writeScopes = ["write", "write:all", `write:${resource}`];
  if (method === "GET" && !scopes.some(s => readScopes.includes(s))) {
    return error("Insufficient scope for read", 403, { required: readScopes });
  }
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && !scopes.some(s => writeScopes.includes(s))) {
    return error("Insufficient scope for write", 403, { required: writeScopes });
  }
  return null;
}

async function handleGet(sql: postgres.Sql, config: ResourceConfig, tenantId: string, resourceId: string | null, url: URL, resource: string) {
  const fields = url.searchParams.get("fields") || "*";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "25"), 100);
  const offset = parseInt(url.searchParams.get("offset") || "0");
  const orderBy = url.searchParams.get("order_by") || "created_at";
  const ascending = url.searchParams.get("order") === "asc";

  const conditions: string[] = [`tenant_id = '${tenantId.replace(/'/g, "''")}'`];

  for (const key of config.filterKeys || []) {
    const val = url.searchParams.get(key);
    if (val) conditions.push(`${sql(key)} = '${val.replace(/'/g, "''")}'`);
  }

  const dateFrom = url.searchParams.get("date_from");
  const dateTo = url.searchParams.get("date_to");
  if (dateFrom) conditions.push(`created_at >= '${dateFrom.replace(/'/g, "''")}'`);
  if (dateTo) conditions.push(`created_at <= '${dateTo.replace(/'/g, "''")}'`);

  const search = url.searchParams.get("search");
  if (search && config.searchFields?.length) {
    const escaped = `%${search.replace(/'/g, "''")}%`;
    const searchParts = config.searchFields.map((f) => `${sql(f)} ILIKE '${escaped}'`);
    conditions.push(`(${searchParts.join(" OR ")})`);
  }

  const whereClause = conditions.join(" AND ");

  if (resourceId) {
    const rows = await sql.unsafe(`SELECT ${sql(fields)}, COUNT(*) OVER() AS total_count FROM ${sql(config.table)} WHERE ${whereClause} AND id = '${resourceId.replace(/'/g, "''")}' LIMIT 1`);
    return { data: rows[0] };
  }

  const rows = await sql.unsafe(`SELECT ${sql(fields)}, COUNT(*) OVER() AS total_count FROM ${sql(config.table)} WHERE ${whereClause} ORDER BY ${sql(orderBy)} ${ascending ? "ASC" : "DESC"} LIMIT ${limit} OFFSET ${offset}`);
  const count = (rows[0] as any)?.total_count || 0;

  return {
    data: rows,
    meta: { total: count, limit, offset, page: Math.floor(offset / limit) + 1, total_pages: Math.ceil(count / limit), has_more: offset + limit < count },
  };
}

async function handleCreate(sql: postgres.Sql, config: ResourceConfig, tenantId: string, body: Record<string, any>, keyRecord: KeyRecord, resource: string) {
  const { id, tenant_id, ...rest } = body;
  const insertData = { ...rest, tenant_id, created_by: rest.created_by || keyRecord.created_by };
  const rows = await sql`INSERT INTO ${sql(config.table)} ${sql(insertData as any)} RETURNING *`;
  return { data: rows[0], message: `${resource} created successfully` };
}

async function handleUpdate(sql: postgres.Sql, config: ResourceConfig, tenantId: string, resourceId: string, body: Record<string, any>, resource: string) {
  const immutable = ["tenant_id", "id", "created_at", "created_by", ...(config.immutableFields || [])];
  for (const f of immutable) delete (body as any)[f];
  const rows = await sql`UPDATE ${sql(config.table)} SET ${sql(body as any)} WHERE id = ${resourceId} AND tenant_id = ${tenantId} RETURNING *`;
  return { data: rows[0], message: `${resource} updated successfully` };
}

async function handleDelete(sql: postgres.Sql, config: ResourceConfig, tenantId: string, resourceId: string, resource: string) {
  const rows = await sql`DELETE FROM ${sql(config.table)} WHERE id = ${resourceId} AND tenant_id = ${tenantId} RETURNING *`;
  return { success: true, message: `${resource} deleted successfully` };
}

export async function handler(req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  const startTime = Date.now();
  const url = new URL(req.url);
  const pathParts = url.pathname.replace(/^\/api-v1\/?/, "").split("/").filter(Boolean);
  const resource = pathParts[0] || "";
  const resourceId = pathParts[1] || null;
  const subResource = pathParts[2] || null;

  const auth = await authenticateRequest(sql, req);
  if ("error" in auth) return auth.error;
  const { keyRecord } = auth;
  const tenantId = keyRecord.tenant_id;
  const scopes: string[] = keyRecord.scopes || ["read"];

  await sql`UPDATE public.api_keys SET last_used_at = now(), requests_count = requests_count + 1 WHERE id = ${keyRecord.id}`;

  try {
    const method = req.method;

    if (!resource) {
      const rows = await sql`SELECT value FROM public.platform_settings WHERE key = 'app_info' LIMIT 1`;
      const apiName = (rows[0] as any)?.value?.app_name || "Dynime";
      return json({
        name: `${apiName} API`,
        version: "1.1.0",
        endpoints: Object.keys(RESOURCES).map((r) => ({
          resource: r,
          url: `/api-v1/${r}`,
          methods: ["GET", "POST", "PUT", "DELETE"],
          filters: RESOURCES[r].filterKeys || [],
          search_fields: RESOURCES[r].searchFields || [],
        })),
        rate_limit: {
          requests_per_minute: keyRecord.rate_limit_per_minute,
          remaining: Math.max(0, keyRecord.rate_limit_per_minute - (rateLimitMap.get(keyRecord.id)?.count || 0)),
        },
        scopes,
      });
    }

    if (resourceId && subResource) {
      const subDefs = SUB_RESOURCES[resource];
      if (subDefs && subDefs[subResource]) {
        const { table, foreignKey } = subDefs[subResource]!;
        return handleSubResource(sql, method, tenantId, table, foreignKey, resourceId, url, req);
      }
      return error(`Unknown sub-resource: ${resource}/${subResource}`, 404);
    }

    if (resource === "stats") return handleStats(sql, tenantId, scopes);

    const config = RESOURCES[resource];
    if (!config) {
      return error(`Unknown resource: ${resource}`, 404, { available_resources: Object.keys(RESOURCES) });
    }

    const scopeError = checkScopes(scopes, method, resource);
    if (scopeError) return scopeError;

    let result: any;
    let statusCode = 200;

    switch (method) {
      case "GET":
        result = await handleGet(sql, config, tenantId, resourceId, url, resource);
        break;
      case "POST":
        result = await handleCreate(sql, config, tenantId, await req.json() as Record<string, any>, keyRecord, resource);
        statusCode = 201;
        break;
      case "PUT":
      case "PATCH":
        if (!resourceId) return error("Resource ID required", 400);
        result = await handleUpdate(sql, config, tenantId, resourceId, await req.json() as Record<string, any>, resource);
        break;
      case "DELETE":
        if (!resourceId) return error("Resource ID required", 400);
        result = await handleDelete(sql, config, tenantId, resourceId, resource);
        break;
      default:
        return error("Method not allowed", 405);
    }

    await logRequest(sql, keyRecord, tenantId, method, resource, resourceId, statusCode, startTime, req);
    return json(result, { status: statusCode });
  } catch (err: any) {
    await logRequest(sql, keyRecord, tenantId, req.method, resource, resourceId, 500, startTime, req);
    console.error("API error:", err);
    const status = err.code === "PGRST116" ? 404 : 500;
    const message = status === 404 ? "Resource not found" : (err.message || "Internal server error");
    return json({ error: message, code: status === 404 ? "NOT_FOUND" : "INTERNAL_ERROR" }, { status });
  }
}

async function handleSubResource(sql: postgres.Sql, method: string, tenantId: string, table: string, foreignKey: string, parentId: string, url: URL, req: Request): Promise<Response> {
  if (method === "GET") {
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "25"), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const rows = await sql`SELECT *, COUNT(*) OVER() AS total_count FROM ${sql(table)} WHERE tenant_id = ${tenantId} AND ${sql(foreignKey)} = ${parentId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    const count = (rows[0] as any)?.total_count || 0;
    return json({ data: rows, meta: { total: count, limit, offset } });
  }
  if (method === "POST") {
    const body = await req.json() as Record<string, any>;
    const rows = await sql`INSERT INTO ${sql(table)} ${sql({ ...body, tenant_id: tenantId, [foreignKey]: parentId } as any)} RETURNING *`;
    return json({ data: rows[0] }, { status: 201 });
  }
  return error("Method not allowed on sub-resource", 405);
}

async function handleStats(sql: postgres.Sql, tenantId: string, scopes: string[]): Promise<Response> {
  if (!scopes.some((s) => ["read", "read:all"].includes(s))) return error("Insufficient scope", 403);
  const tables = ["deals", "employees", "invoices", "expenses", "documents", "campaigns", "departments", "budgets"];
  const counts: Record<string, number> = {};
  for (const table of tables) {
    const rows = await sql`SELECT COUNT(*)::bigint AS count FROM ${sql(table)} WHERE tenant_id = ${tenantId}`;
    counts[table] = Number((rows[0] as any)?.count || 0);
  }
  return json({ data: counts, generated_at: new Date().toISOString() });
}

async function logRequest(sql: postgres.Sql, keyRecord: KeyRecord, tenantId: string, method: string, resource: string, resourceId: string | null, statusCode: number, startTime: number, req: Request): Promise<void> {
  const path = `/${resource}${resourceId ? `/${resourceId}` : ""}`;
  await sql`INSERT INTO public.api_request_logs (api_key_id, tenant_id, method, endpoint, status_code, response_time_ms, ip_address, user_agent) VALUES (${keyRecord.id}, ${tenantId}, ${method}, ${path}, ${statusCode}, ${Date.now() - startTime}, ${req.headers.get("x-forwarded-for") || "unknown"}, ${req.headers.get("user-agent") || "unknown"})`;
}
