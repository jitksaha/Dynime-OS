// Phase 6 — Realtime via Durable Object. Replaces Supabase Realtime (postgres_changes).
//
// Supabase Realtime worked by tailing Postgres logical replication and pushing row
// changes to subscribed clients. Off-platform we don't have that stream, so we flip
// the model: whoever WRITES a row also POSTs the change to this DO, which fans it out
// to connected WebSocket clients on the matching channel.
//
//   client:  ws  /realtime?channel=live-chat-<id>          (subscribe)
//   writer:  POST /realtime?channel=live-chat-<id>  { event, table, new, old }   (publish)
//
// The publish call is made by:
//   - the data API (rest.ts) — OPTIONAL: emit after INSERT/UPDATE/DELETE, or
//   - the specific Worker that performs the write (e.g. live-chat function).
// Keeping it explicit avoids needing replication.

import type { Env } from "../_shared/env";

interface ChangePayload {
  event: "INSERT" | "UPDATE" | "DELETE";
  schema?: string;
  table: string;
  new?: Record<string, unknown>;
  old?: Record<string, unknown>;
}

export class RealtimeChannel implements DurableObject {
  private sockets = new Set<WebSocket>();

  constructor(private state: DurableObjectState, private env: Env) {}

  async fetch(req: Request): Promise<Response> {
    const upgrade = req.headers.get("Upgrade");

    // WebSocket subscribe
    if (upgrade === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];
      server.accept();
      this.sockets.add(server);
      server.addEventListener("close", () => this.sockets.delete(server));
      server.addEventListener("error", () => this.sockets.delete(server));
      return new Response(null, { status: 101, webSocket: client });
    }

    // Publish (server-to-server)
    if (req.method === "POST") {
      const payload = await req.json() as ChangePayload;
      const message = JSON.stringify({ type: "postgres_changes", payload });
      for (const ws of this.sockets) {
        try { ws.send(message); } catch { this.sockets.delete(ws); }
      }
      return new Response(JSON.stringify({ delivered: this.sockets.size }), {
        headers: { "content-type": "application/json" },
      });
    }

    return new Response("Realtime channel: connect via WebSocket or POST a change.", { status: 400 });
  }
}

// Helper other Workers call to publish a change to a channel.
export async function publishChange(env: Env, channel: string, payload: ChangePayload): Promise<void> {
  const id = env.REALTIME.idFromName(channel);
  await env.REALTIME.get(id).fetch("https://do/realtime", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}
