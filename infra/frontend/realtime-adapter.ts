// Phase 6 — Frontend realtime adapter. Drop-in for the bits of the Supabase realtime
// client the app uses: `.channel(name).on('postgres_changes', filter, cb).subscribe()`
// and `removeChannel(channel)`.
//
// It opens a WebSocket to the Workers realtime DO (/realtime?channel=<name>) and
// invokes the callback with `{ new, old, eventType }` payloads — same shape the app
// already destructures (payload.new). See infra/workers/src/realtime/channel.ts.
//
// Install: copy to `src/integrations/realtime/client.ts`; replace `realtimeClient`
// imports with this behind VITE_USE_WORKERS_REALTIME.

const API_BASE: string = (import.meta as any).env?.VITE_API_BASE_URL || "";

type ChangeHandler = (payload: { eventType: string; new: any; old: any; table: string }) => void;

interface Filter {
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  schema?: string;
  table?: string;
  filter?: string; // e.g. "conversation_id=eq.<id>"
}

class Channel {
  private ws: WebSocket | null = null;
  private handlers: Array<{ filter: Filter; cb: ChangeHandler }> = [];
  private closed = false;

  constructor(public name: string) {}

  on(_type: "postgres_changes", filter: Filter, cb: ChangeHandler): Channel {
    this.handlers.push({ filter, cb });
    return this;
  }

  subscribe(): Channel {
    const url = `${API_BASE.replace(/^http/, "ws")}/realtime?channel=${encodeURIComponent(this.name)}`;
    const connect = () => {
      if (this.closed) return;
      this.ws = new WebSocket(url);
      this.ws.onmessage = (ev) => {
        try {
          const { payload } = JSON.parse(ev.data);
          for (const h of this.handlers) {
            if (h.filter.table && h.filter.table !== payload.table) continue;
            if (h.filter.event && h.filter.event !== "*" && h.filter.event !== payload.event) continue;
            if (h.filter.filter && !matchFilter(h.filter.filter, payload.new)) continue;
            h.cb({ eventType: payload.event, new: payload.new, old: payload.old, table: payload.table });
          }
        } catch { /* ignore malformed */ }
      };
      // Auto-reconnect with backoff.
      this.ws.onclose = () => { if (!this.closed) setTimeout(connect, 2000); };
    };
    connect();
    return this;
  }

  unsubscribe() {
    this.closed = true;
    this.ws?.close();
    this.ws = null;
  }
}

// Parse a single "col=eq.value" PostgREST filter against the row.
function matchFilter(filter: string, row: any): boolean {
  if (!row) return false;
  const m = filter.match(/^([a-zA-Z0-9_]+)=eq\.(.+)$/);
  if (!m) return true; // unsupported filter -> don't drop
  return String(row[m[1]]) === m[2];
}

export const realtimeClient = {
  channel(name: string) { return new Channel(name); },
  removeChannel(channel: Channel) { channel.unsubscribe(); },
};
export default realtimeClient;
