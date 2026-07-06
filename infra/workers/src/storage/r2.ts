// Phase 6 — R2 object proxy. Replaces Supabase Storage's object endpoints.
// Object keys preserve the "<bucket>/<path>" layout from the Phase 3 migration.
//
//   GET    /storage/<bucket>/<path>        -> stream object (public read)
//   POST   /storage/<bucket>/<path>        -> upload (authed)
//   DELETE /storage/<bucket>/<path>        -> delete (authed)
//
// Access control: reads are public here (matches Supabase public buckets). For
// private buckets, gate GET on contextFromRequest() + a row check, or issue signed
// URLs. Writes require a valid session.

import type { Env } from "../_shared/env";
import { error, corsHeaders } from "../_shared/cors";
import { contextFromRequest } from "../_shared/auth-context";

export async function handleStorage(req: Request, env: Env, path: string): Promise<Response> {
  const key = decodeURIComponent(path.replace(/^\/storage\//, "")); // "<bucket>/<path>"
  if (!key || key.includes("..")) return error("Invalid object key", 400);

  if (req.method === "GET") {
    const obj = await env.STORAGE.get(key);
    if (!obj) return error("Not found", 404);
    const headers = new Headers(corsHeaders);
    obj.writeHttpMetadata(headers);
    headers.set("etag", obj.httpEtag);
    headers.set("cache-control", obj.httpMetadata?.cacheControl || "public, max-age=31536000");
    return new Response(obj.body, { headers });
  }

  // Writes require auth.
  const ctx = await contextFromRequest(req, env);
  if (ctx.role === "anon") return error("Unauthorized", 401);

  if (req.method === "POST" || req.method === "PUT") {
    const contentType = req.headers.get("content-type") || "application/octet-stream";
    await env.STORAGE.put(key, req.body, { httpMetadata: { contentType } });
    return new Response(JSON.stringify({ Key: key }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method === "DELETE") {
    await env.STORAGE.delete(key);
    return new Response(JSON.stringify({ message: "deleted" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return error("Method not allowed", 405);
}
