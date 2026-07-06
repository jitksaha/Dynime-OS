// Resolve the SessionContext for an incoming request from its Authorization header.
// Used by the data API and the functions gateway to enforce RLS per request.

import type { Env } from "./env";
import { verifyAccessToken } from "./jwt";
import type { SessionContext } from "./db";

export async function contextFromRequest(req: Request, env: Env): Promise<SessionContext> {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();

  if (!token) return { userId: null, role: "anon" };

  // Service-role token (server-to-server): full bypass, like the old service key.
  if (token === env.SERVICE_ROLE_TOKEN) {
    return { userId: null, role: "service_role" };
  }

  const claims = await verifyAccessToken(env, token);
  if (!claims) return { userId: null, role: "anon" };

  return {
    userId: claims.sub,
    role: claims.role === "service_role" ? "service_role" : "authenticated",
    email: claims.email ?? null,
    claims,
  };
}
