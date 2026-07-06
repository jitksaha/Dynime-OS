// Phase 6 — Minimal PostgREST-compatible data API over Hyperdrive.
//
// The frontend uses the Supabase client's `.from(table).select()/.insert()/.update()/.delete()`
// across dozens of files. Two cutover options:
//   (A) Keep @supabase/supabase-js as a *PostgREST client* pointed at THIS endpoint
//       (set its REST url to `${API_BASE}/rest/v1` and the apikey/Authorization to our JWT).
//       This is the lowest-churn path — the query builder stays identical.
//   (B) Replace the client entirely (more work). Not recommended for first cutover.
//
// This handler implements the subset of PostgREST the app actually uses. Every query
// runs through `withSession` so the compat RLS (auth.uid()) is enforced exactly as on Supabase.
//
// Supported (v1):
//   GET    /rest/v1/<table>?col=eq.val&select=a,b&limit=&order=col.asc&offset=
//   POST   /rest/v1/<table>            (insert; Prefer: return=representation)
//   PATCH  /rest/v1/<table>?col=eq.val (update)
//   DELETE /rest/v1/<table>?col=eq.val
// Operators: eq, neq, gt, gte, lt, lte, like, ilike, in, is. Logical AND only (PostgREST default).

import type { Env } from "../_shared/env";
import { json, error, corsHeaders } from "../_shared/cors";
import { connect, withSession } from "../_shared/db";
import { contextFromRequest } from "../_shared/auth-context";

const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/; // guard table/column names (no quoting tricks)

function parseFilter(value: string): { op: string; val: string } | null {
  const i = value.indexOf(".");
  if (i === -1) return null;
  return { op: value.slice(0, i), val: value.slice(i + 1) };
}

const OPS: Record<string, string> = {
  eq: "=", neq: "<>", gt: ">", gte: ">=", lt: "<", lte: "<=", like: "LIKE", ilike: "ILIKE",
};

export async function handleData(req: Request, env: Env, path: string): Promise<Response> {
  const url = new URL(req.url);
  const table = path.replace(/^\/rest\/v1\//, "").split("/")[0].split("?")[0];
  if (!IDENT.test(table)) return error("Invalid table name", 400);

  const sql = connect(env);
  const ctx = await contextFromRequest(req, env);

  // Build WHERE from query params (skip reserved ones).
  const reserved = new Set(["select", "order", "limit", "offset", "on_conflict"]);
  const wheres: Array<{ col: string; op: string; val: string }> = [];
  for (const [key, raw] of url.searchParams) {
    if (reserved.has(key)) continue;
    if (!IDENT.test(key)) return error(`Invalid column: ${key}`, 400);
    const f = parseFilter(raw);
    if (!f) continue;
    wheres.push({ col: key, op: f.op, val: f.val });
  }

  try {
    return await withSession(sql, ctx, async (tx) => {
      const buildWhere = () => {
        if (!wheres.length) return tx``;
        let frag = tx`WHERE`;
        wheres.forEach((w, idx) => {
          const col = tx(w.col);
          const prefix = idx === 0 ? tx`` : tx`AND`;
          if (w.op === "in") {
            const list = w.val.replace(/^\(|\)$/g, "").split(",");
            frag = tx`${frag} ${prefix} ${col} IN ${tx(list)}`;
          } else if (w.op === "is") {
            const v = w.val === "null" ? tx`NULL` : tx`${w.val}`;
            frag = tx`${frag} ${prefix} ${col} IS ${v}`;
          } else {
            const opSql = OPS[w.op];
            if (!opSql) throw new Error(`Unsupported operator: ${w.op}`);
            frag = tx`${frag} ${prefix} ${col} ${tx.unsafe(opSql)} ${w.val}`;
          }
        });
        return frag;
      };

      if (req.method === "GET") {
        const select = url.searchParams.get("select");
        const cols = select && select !== "*"
          ? tx(select.split(",").map((c) => c.trim()).filter((c) => IDENT.test(c)))
          : tx.unsafe("*");
        const order = url.searchParams.get("order");
        let q = tx`SELECT ${cols} FROM ${tx(table)} ${buildWhere()}`;
        if (order) {
          const [oc, dir] = order.split(".");
          if (IDENT.test(oc)) q = tx`${q} ORDER BY ${tx(oc)} ${dir === "desc" ? tx.unsafe("DESC") : tx.unsafe("ASC")}`;
        }
        const limit = parseInt(url.searchParams.get("limit") || "0", 10);
        if (limit > 0) q = tx`${q} LIMIT ${limit}`;
        const offset = parseInt(url.searchParams.get("offset") || "0", 10);
        if (offset > 0) q = tx`${q} OFFSET ${offset}`;
        const rows = await q;
        return json(rows);
      }

      if (req.method === "POST") {
        const body = await req.json() as any;
        const rows = Array.isArray(body) ? body : [body];
        const inserted = await tx`INSERT INTO ${tx(table)} ${tx(rows)} RETURNING *`;
        return json(inserted, { status: 201 });
      }

      if (req.method === "PATCH") {
        const body = await req.json() as any;
        const updated = await tx`UPDATE ${tx(table)} SET ${tx(body)} ${buildWhere()} RETURNING *`;
        return json(updated);
      }

      if (req.method === "DELETE") {
        const deleted = await tx`DELETE FROM ${tx(table)} ${buildWhere()} RETURNING *`;
        return json(deleted);
      }

      return error("Method not allowed", 405);
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
