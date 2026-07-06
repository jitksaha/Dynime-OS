// Dynime OS — single Worker entrypoint. Routes everything that used to be Supabase.
//
//   /auth/*        -> auth service        (Phase 4)
//   /functions/*   -> functions gateway   (Phase 5; ported edge functions)
//   /rest/v1/*     -> PostgREST-ish data API over Hyperdrive (Phase 6)
//   /realtime      -> Durable Object WebSocket (Phase 6)
//   /storage/*     -> R2 object proxy (signed/public reads)  (Phase 3/6)
//
// Cron triggers (pg_cron replacement) are handled by `scheduled`.

import type { Env } from "./_shared/env";
import { preflight, error } from "./_shared/cors";
import { handleAuth } from "./auth/index";
import { handleFunctions } from "./functions/gateway";
import { handleData } from "./data/rest";
import { handleStorage } from "./storage/r2";
import { handleScheduled } from "./cron";

export { RealtimeChannel } from "./realtime/channel";

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const pre = preflight(req);
    if (pre) return pre;

    const url = new URL(req.url);
    const path = url.pathname;

    try {
      if (path.startsWith("/auth/")) return await handleAuth(req, env, path);
      if (path.startsWith("/functions/")) return await handleFunctions(req, env, ctx, path);
      if (path.startsWith("/rest/v1/")) return await handleData(req, env, path);
      if (path.startsWith("/storage/")) return await handleStorage(req, env, path);
      if (path === "/realtime") {
        // Route to a DO instance keyed by channel name.
        const channel = url.searchParams.get("channel") || "default";
        const id = env.REALTIME.idFromName(channel);
        return env.REALTIME.get(id).fetch(req);
      }
      if (path === "/health") return new Response("ok");
      return error("Not found", 404);
    } catch (e) {
      return error(`Worker error: ${(e as Error).message}`, 500);
    }
  },

  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleScheduled(event, env));
  },
};
