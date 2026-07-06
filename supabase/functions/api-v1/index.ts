import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

// ── Helpers ──────────────────────────────────────────────────

async function hashKey(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function jsonResponse(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(status: number, message: string, code: string, extra?: Record<string, any>) {
  return jsonResponse(status, { error: message, code, ...extra });
}

// ── Rate Limiter (in-memory, per-instance) ───────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

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

// ── Resource Configuration ───────────────────────────────────

interface ResourceConfig {
  table: string;
  searchFields?: string[];
  filterKeys?: string[];
  immutableFields?: string[];
}

const RESOURCES: Record<string, ResourceConfig> = {
  deals:                { table: "deals",              searchFields: ["name", "email", "contact_name"],           filterKeys: ["status", "stage", "priority", "source"] },
  employees:            { table: "employees",          searchFields: ["full_name", "email"],                      filterKeys: ["status", "department"] },
  invoices:             { table: "invoices",           searchFields: ["invoice_number", "client"],                filterKeys: ["status"] },
  expenses:             { table: "expenses",           searchFields: ["description", "category"],                 filterKeys: ["status", "category"] },
  documents:            { table: "documents",          searchFields: ["name"],                                    filterKeys: ["doc_type"] },
  campaigns:            { table: "campaigns",          searchFields: ["name"],                                    filterKeys: ["status", "channel"] },
  "leave-requests":     { table: "leave_requests",     searchFields: ["employee_name"],                           filterKeys: ["status", "leave_type"] },
  attendance:           { table: "attendance_records", searchFields: ["employee_name"],                           filterKeys: ["status", "attendance_type"] },
  departments:          { table: "departments",        searchFields: ["name"],                                    filterKeys: [] },
  notifications:        { table: "notifications",      searchFields: ["title", "message"],                        filterKeys: ["type", "read"] },
  "job-postings":       { table: "job_postings",       searchFields: ["title", "department"],                     filterKeys: ["status", "department", "employment_type"] },
  "job-applications":   { table: "job_applications",   searchFields: ["applicant_name", "applicant_email"],       filterKeys: ["status"] },
  "lead-follow-ups":    { table: "lead_follow_ups",    searchFields: ["notes"],                                   filterKeys: ["status", "type"] },
  "email-templates":    { table: "email_templates",    searchFields: ["name", "subject_line"],                    filterKeys: ["category"] },
  "late-records":       { table: "late_records",       searchFields: ["employee_name"],                           filterKeys: ["excused"] },
  "approval-workflows": { table: "approval_workflows", searchFields: ["name"],                                   filterKeys: ["module", "is_active"] },
  "kyc-verifications":  { table: "kyc_verifications",  searchFields: ["full_name", "document_number"],            filterKeys: ["status", "document_type"] },
  "audit-logs":         { table: "audit_logs",         searchFields: ["action"],                                  filterKeys: ["action", "module"] },
  budgets:              { table: "budgets",            searchFields: ["name", "category"],                        filterKeys: ["status", "period"] },
  "employee-loans":     { table: "employee_loans",     searchFields: ["employee_name"],                           filterKeys: ["status", "loan_type"] },
  "employee-warnings":  { table: "employee_warnings",  searchFields: ["employee_name", "reason"],                 filterKeys: ["status", "severity", "warning_type"] },
  meetings:             { table: "meetings",            searchFields: ["title", "description"],                    filterKeys: ["status", "provider", "meeting_type"] },
};

// Sub-resource definitions: parent → { subPath → { table, foreignKey } }
const SUB_RESOURCES: Record<string, Record<string, { table: string; foreignKey: string }>> = {
  deals:          { "follow-ups":   { table: "lead_follow_ups",  foreignKey: "deal_id" } },
  invoices:       { items:          { table: "invoice_items",    foreignKey: "invoice_id" } },
  "job-postings": { applications:   { table: "job_applications", foreignKey: "job_id" } },
};

// ── Auth & Key Validation ────────────────────────────────────

async function authenticateRequest(supabase: any, req: Request) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return { error: errorResponse(401, "Missing X-API-Key header", "AUTH_MISSING_KEY") };

  const keyHash = await hashKey(apiKey);
  const { data: keyRecord, error: keyError } = await supabase
    .from("api_keys")
    .select("*")
    .eq("key_hash", keyHash)
    .eq("is_active", true)
    .maybeSingle();

  if (keyError || !keyRecord) return { error: errorResponse(401, "Invalid API key", "AUTH_INVALID_KEY") };
  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) return { error: errorResponse(401, "API key expired", "AUTH_KEY_EXPIRED") };

  // Rate limiting
  if (!checkRateLimit(keyRecord.id, keyRecord.rate_limit_per_minute)) {
    return { error: errorResponse(429, "Rate limit exceeded", "RATE_LIMIT_EXCEEDED", {
      retry_after_seconds: 60,
      limit: keyRecord.rate_limit_per_minute,
    }) };
  }

  return { keyRecord };
}

function checkScopes(scopes: string[], method: string, resource: string) {
  const readScopes = ["read", "read:all", `read:${resource}`];
  const writeScopes = ["write", "write:all", `write:${resource}`];
  if (method === "GET" && !scopes.some(s => readScopes.includes(s)))
    return errorResponse(403, "Insufficient scope for read", "SCOPE_DENIED", { required: readScopes });
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && !scopes.some(s => writeScopes.includes(s)))
    return errorResponse(403, "Insufficient scope for write", "SCOPE_DENIED", { required: writeScopes });
  return null;
}

// ── CRUD Handlers ────────────────────────────────────────────

async function handleGet(
  supabase: any, config: ResourceConfig, tenantId: string,
  resourceId: string | null, url: URL, resource: string
) {
  const fields = url.searchParams.get("fields") || "*";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "25"), 100);
  const offset = parseInt(url.searchParams.get("offset") || "0");
  const orderBy = url.searchParams.get("order_by") || "created_at";
  const ascending = url.searchParams.get("order") === "asc";

  let query = supabase.from(config.table).select(fields, { count: "exact" }).eq("tenant_id", tenantId);

  // Apply filters
  for (const key of config.filterKeys || []) {
    const val = url.searchParams.get(key);
    if (val) query = query.eq(key, val);
  }

  // Date range
  const dateFrom = url.searchParams.get("date_from");
  const dateTo = url.searchParams.get("date_to");
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", dateTo);

  // Search
  const search = url.searchParams.get("search");
  if (search && config.searchFields?.length) {
    query = query.or(config.searchFields.map(f => `${f}.ilike.%${search}%`).join(","));
  }

  if (resourceId) {
    const { data, error } = await query.eq("id", resourceId).single();
    if (error) throw error;
    return { data };
  }

  const { data, error, count } = await query
    .order(orderBy, { ascending })
    .range(offset, offset + limit - 1);
  if (error) throw error;

  return {
    data,
    meta: {
      total: count,
      limit,
      offset,
      page: Math.floor(offset / limit) + 1,
      total_pages: Math.ceil((count || 0) / limit),
      has_more: offset + limit < (count || 0),
    },
  };
}

async function handleCreate(
  supabase: any, config: ResourceConfig, tenantId: string,
  req: Request, keyRecord: any, resource: string
) {
  const body = await req.json();
  delete body.id;
  delete body.tenant_id;
  const insertData = { ...body, tenant_id: tenantId };
  if (!insertData.created_by) insertData.created_by = keyRecord.created_by;

  const { data, error } = await supabase
    .from(config.table)
    .insert(insertData)
    .select()
    .single();
  if (error) throw error;
  return { data, message: `${resource} created successfully` };
}

async function handleUpdate(
  supabase: any, config: ResourceConfig, tenantId: string,
  resourceId: string, req: Request, resource: string
) {
  const body = await req.json();
  // Remove immutable fields
  for (const f of ["tenant_id", "id", "created_at", "created_by", ...(config.immutableFields || [])]) {
    delete body[f];
  }

  const { data, error } = await supabase
    .from(config.table)
    .update(body)
    .eq("id", resourceId)
    .eq("tenant_id", tenantId)
    .select()
    .single();
  if (error) throw error;
  return { data, message: `${resource} updated successfully` };
}

async function handleDelete(
  supabase: any, config: ResourceConfig, tenantId: string,
  resourceId: string, resource: string
) {
  const { error } = await supabase
    .from(config.table)
    .delete()
    .eq("id", resourceId)
    .eq("tenant_id", tenantId);
  if (error) throw error;
  return { success: true, message: `${resource} deleted successfully` };
}

// ── Sub-Resource Handler ─────────────────────────────────────

async function handleSubResource(
  supabase: any, method: string, tenantId: string,
  table: string, foreignKey: string, parentId: string, url: URL, req: Request
) {
  if (method === "GET") {
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "25"), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const { data, error, count } = await supabase
      .from(table)
      .select("*", { count: "exact" })
      .eq("tenant_id", tenantId)
      .eq(foreignKey, parentId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return jsonResponse(200, { data, meta: { total: count, limit, offset } });
  }
  if (method === "POST") {
    const body = await req.json();
    const { data, error } = await supabase
      .from(table)
      .insert({ ...body, tenant_id: tenantId, [foreignKey]: parentId })
      .select()
      .single();
    if (error) throw error;
    return jsonResponse(201, { data });
  }
  return errorResponse(405, "Method not allowed on sub-resource", "METHOD_NOT_ALLOWED");
}

// ── Stats Handler ────────────────────────────────────────────

async function handleStats(supabase: any, tenantId: string, scopes: string[]) {
  if (!scopes.some(s => ["read", "read:all"].includes(s)))
    return errorResponse(403, "Insufficient scope", "SCOPE_DENIED");

  const tables = ["deals", "employees", "invoices", "expenses", "documents", "campaigns", "departments", "budgets"];
  const counts: Record<string, number> = {};

  await Promise.all(tables.map(async (table) => {
    const { count } = await supabase.from(table).select("*", { count: "exact", head: true }).eq("tenant_id", tenantId);
    counts[table] = count || 0;
  }));

  return jsonResponse(200, { data: counts, generated_at: new Date().toISOString() });
}

// ── Request Logger ───────────────────────────────────────────

function logRequest(
  supabase: any, keyRecord: any, tenantId: string,
  method: string, resource: string, resourceId: string | null,
  statusCode: number, startTime: number, req: Request
) {
  supabase.from("api_request_logs").insert({
    api_key_id: keyRecord.id,
    tenant_id: tenantId,
    method,
    endpoint: `/${resource}${resourceId ? `/${resourceId}` : ""}`,
    status_code: statusCode,
    response_time_ms: Date.now() - startTime,
    ip_address: req.headers.get("x-forwarded-for") || "unknown",
    user_agent: req.headers.get("user-agent") || "unknown",
  }).then();
}

// ── Main Handler ─────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  const url = new URL(req.url);
  const pathParts = url.pathname.replace(/^\/api-v1\/?/, "").split("/").filter(Boolean);
  const resource = pathParts[0] || "";
  const resourceId = pathParts[1] || null;
  const subResource = pathParts[2] || null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // ── Authenticate ──
  const auth = await authenticateRequest(supabase, req);
  if (auth.error) return auth.error;
  const { keyRecord } = auth;
  const tenantId = keyRecord.tenant_id;
  const scopes: string[] = keyRecord.scopes || ["read"];

  // Update usage async
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString(), requests_count: keyRecord.requests_count + 1 })
    .eq("id", keyRecord.id)
    .then();

  try {
    const method = req.method;

    // ── Root: API info ──
    if (!resource) {
      // Fetch dynamic app name
      const { data: appInfoRow } = await supabase.from("platform_settings").select("value").eq("key", "app_info").maybeSingle();
      const apiName = (appInfoRow?.value as any)?.app_name || "Dynime";
      return jsonResponse(200, {
        name: `${apiName} API`,
        version: "1.1.0",
        endpoints: Object.keys(RESOURCES).map(r => ({
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

    // ── Sub-resources ──
    if (resourceId && subResource) {
      const subDefs = SUB_RESOURCES[resource];
      if (subDefs && subDefs[subResource]) {
        const { table, foreignKey } = subDefs[subResource];
        return await handleSubResource(supabase, method, tenantId, table, foreignKey, resourceId, url, req);
      }
      return errorResponse(404, `Unknown sub-resource: ${resource}/${subResource}`, "SUB_RESOURCE_NOT_FOUND");
    }

    // ── Stats ──
    if (resource === "stats") {
      return await handleStats(supabase, tenantId, scopes);
    }

    // ── Validate resource ──
    const config = RESOURCES[resource];
    if (!config) {
      return errorResponse(404, `Unknown resource: ${resource}`, "RESOURCE_NOT_FOUND", {
        available_resources: Object.keys(RESOURCES),
      });
    }

    // ── Scope check ──
    const scopeError = checkScopes(scopes, method, resource);
    if (scopeError) return scopeError;

    // ── Dispatch ──
    let result: any;
    let statusCode = 200;

    switch (method) {
      case "GET":
        result = await handleGet(supabase, config, tenantId, resourceId, url, resource);
        break;
      case "POST":
        result = await handleCreate(supabase, config, tenantId, req, keyRecord, resource);
        statusCode = 201;
        break;
      case "PUT":
      case "PATCH":
        if (!resourceId) return errorResponse(400, "Resource ID required", "MISSING_ID");
        result = await handleUpdate(supabase, config, tenantId, resourceId, req, resource);
        break;
      case "DELETE":
        if (!resourceId) return errorResponse(400, "Resource ID required", "MISSING_ID");
        result = await handleDelete(supabase, config, tenantId, resourceId, resource);
        break;
      default:
        return errorResponse(405, "Method not allowed", "METHOD_NOT_ALLOWED");
    }

    logRequest(supabase, keyRecord, tenantId, method, resource, resourceId, statusCode, startTime, req);
    return jsonResponse(statusCode, result);
  } catch (err: any) {
    logRequest(supabase, keyRecord, tenantId, req.method, resource, resourceId, 500, startTime, req);
    console.error("API error:", err);
    const status = err.code === "PGRST116" ? 404 : 500;
    const message = status === 404 ? "Resource not found" : (err.message || "Internal server error");
    return jsonResponse(status, { error: message, code: status === 404 ? "NOT_FOUND" : "INTERNAL_ERROR" });
  }
});
