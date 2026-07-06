// Phase 5 — Frontend shim for `supabase.functions.invoke`.
//
// Call sites do: `supabase.functions.invoke('stripe-checkout', { body })`.
// At cutover (Phase 6) `supabase.functions` is replaced with this object so those
// call sites are unchanged. It hits the Workers functions gateway instead.
//
// Install: copy to `src/integrations/functions/invoke.ts`; have the data client
// expose `.functions = functionsShim` behind VITE_USE_WORKERS_FUNCTIONS.

import { getAccessToken } from "./token"; // tiny helper that reads the current session token

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "";

export interface InvokeOptions {
  body?: unknown;
  headers?: Record<string, string>;
  method?: "POST" | "GET" | "PUT" | "PATCH" | "DELETE";
}

export interface InvokeResult<T = unknown> {
  data: T | null;
  error: { message: string; status?: number } | null;
}

async function invoke<T = unknown>(name: string, options: InvokeOptions = {}): Promise<InvokeResult<T>> {
  const token = getAccessToken();
  const isJson = options.body !== undefined && !(options.body instanceof FormData);
  try {
    const res = await fetch(`${API_BASE}/functions/${name}`, {
      method: options.method || "POST",
      headers: {
        ...(isJson ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      body: options.body === undefined
        ? undefined
        : (options.body instanceof FormData ? options.body : JSON.stringify(options.body)),
    });

    const ct = res.headers.get("content-type") || "";
    const payload = ct.includes("application/json") ? await res.json() : await res.text();

    if (!res.ok) {
      const message = (payload && typeof payload === "object" && "error" in payload)
        ? String((payload as any).error) : `Function ${name} failed (${res.status})`;
      return { data: null, error: { message, status: res.status } };
    }
    return { data: payload as T, error: null };
  } catch (e) {
    return { data: null, error: { message: (e as Error).message } };
  }
}

// Supabase-shaped surface: `functions.invoke(name, opts)`.
export const functionsShim = { invoke };
export default functionsShim;
