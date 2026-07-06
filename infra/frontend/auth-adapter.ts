// Phase 4 — Frontend auth adapter. Drop-in for `supabase.auth.*`.
//
// At cutover (Phase 6) this is wired into the data client so existing code that
// calls `supabase.auth.signInWithPassword(...)`, `getSession()`, `onAuthStateChange()`,
// `signOut()`, `updateUser()`, etc. keeps working against our Workers auth service.
//
// Install location: copy to `src/integrations/auth/auth-adapter.ts` and have
// `src/integrations/supabase/client.ts` export `auth` from here behind the
// VITE_USE_WORKERS_AUTH flag (see Phase 6 cutover notes).
//
// Surface implemented (from the frontend inventory):
//   signInWithPassword, signUp, signOut, getSession, getUser, setSession,
//   updateUser, onAuthStateChange, verifyOtp, refreshSession,
//   signInWithOAuth, and a minimal mfa.* stub.

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "";
const STORAGE_KEY = "dynime.auth.session";

export interface Session {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number; // epoch seconds
  user: AuthUser;
}
export interface AuthUser {
  id: string;
  email: string | null;
  user_metadata: Record<string, unknown>;
  app_metadata: Record<string, unknown>;
  aud: string;
  role: string;
}

type AuthEvent = "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED" | "INITIAL_SESSION" | "USER_UPDATED";
type Listener = (event: AuthEvent, session: Session | null) => void;

const listeners = new Set<Listener>();
let current: Session | null = loadSession();
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch { return null; }
}
function persist(s: Session | null) {
  current = s;
  try {
    if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
  scheduleRefresh();
}
function emit(event: AuthEvent) {
  for (const l of listeners) { try { l(event, current); } catch { /* ignore */ } }
}
function withExpiry(raw: Omit<Session, "expires_at">): Session {
  return { ...raw, expires_at: Math.floor(Date.now() / 1000) + raw.expires_in };
}
function scheduleRefresh() {
  if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; }
  if (!current) return;
  const ms = Math.max(5_000, (current.expires_at - 60) * 1000 - Date.now());
  refreshTimer = setTimeout(() => { void refreshSession(); }, ms);
}

async function post(path: string, body: unknown, token?: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

// --- Public surface (Supabase-shaped: { data, error }) ----------------------

export async function signInWithPassword({ email, password }: { email: string; password: string }) {
  const { res, data } = await post("/auth/token?grant_type=password", { email, password });
  if (!res.ok) return { data: { user: null, session: null }, error: { message: data.error || "Sign-in failed" } };
  const session = withExpiry(data);
  persist(session); emit("SIGNED_IN");
  return { data: { user: session.user, session }, error: null };
}

export async function signUp({ email, password, options }: { email: string; password: string; options?: { data?: Record<string, unknown> } }) {
  const { res, data } = await post("/auth/signup", { email, password, data: options?.data });
  if (!res.ok) return { data: { user: null, session: null }, error: { message: data.error || "Sign-up failed" } };
  const session = withExpiry(data);
  persist(session); emit("SIGNED_IN");
  return { data: { user: session.user, session }, error: null };
}

export async function signOut() {
  const token = current?.access_token;
  await post("/auth/logout", { refresh_token: current?.refresh_token }, token).catch(() => {});
  persist(null); emit("SIGNED_OUT");
  return { error: null };
}

export async function getSession() {
  if (current && current.expires_at <= Math.floor(Date.now() / 1000)) {
    await refreshSession();
  }
  return { data: { session: current }, error: null };
}

export async function getUser() {
  if (!current) return { data: { user: null }, error: null };
  const res = await fetch(`${API_BASE}/auth/user`, {
    headers: { authorization: `Bearer ${current.access_token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { data: { user: null }, error: { message: data.error || "Failed" } };
  return { data: { user: data.user as AuthUser }, error: null };
}

export async function setSession({ access_token, refresh_token }: { access_token: string; refresh_token: string }) {
  // Used after OAuth fragment parsing / cross-tab. Refresh to hydrate the user.
  const { res, data } = await post("/auth/token?grant_type=refresh_token", { refresh_token });
  if (!res.ok) {
    // fall back to the provided tokens with an unknown expiry
    const minimal = withExpiry({ access_token, refresh_token, token_type: "bearer", expires_in: 3600, user: current?.user as AuthUser });
    persist(minimal); emit("TOKEN_REFRESHED");
    return { data: { session: minimal, user: minimal.user }, error: null };
  }
  const session = withExpiry(data);
  persist(session); emit("TOKEN_REFRESHED");
  return { data: { session, user: session.user }, error: null };
}

export async function refreshSession() {
  if (!current?.refresh_token) return { data: { session: null, user: null }, error: { message: "No session" } };
  const { res, data } = await post("/auth/token?grant_type=refresh_token", { refresh_token: current.refresh_token });
  if (!res.ok) { persist(null); emit("SIGNED_OUT"); return { data: { session: null, user: null }, error: { message: data.error || "Refresh failed" } }; }
  const session = withExpiry(data);
  persist(session); emit("TOKEN_REFRESHED");
  return { data: { session, user: session.user }, error: null };
}

export async function updateUser(attrs: { email?: string; password?: string; data?: Record<string, unknown> }) {
  if (!current) return { data: { user: null }, error: { message: "Not authenticated" } };
  const res = await fetch(`${API_BASE}/auth/user`, {
    method: "PUT",
    headers: { "content-type": "application/json", authorization: `Bearer ${current.access_token}` },
    body: JSON.stringify(attrs),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { data: { user: null }, error: { message: data.error || "Update failed" } };
  if (current) { current.user = data.user; persist(current); }
  emit("USER_UPDATED");
  return { data: { user: data.user as AuthUser }, error: null };
}

export function signInWithOAuth({ provider, options }: { provider: string; options?: { redirectTo?: string } }) {
  const redirect = encodeURIComponent(options?.redirectTo || window.location.origin);
  window.location.href = `${API_BASE}/auth/authorize?provider=${provider}&redirect_to=${redirect}`;
  return Promise.resolve({ data: { provider, url: null }, error: null });
}

// Called on app load to capture an OAuth redirect (#access_token=...&refresh_token=...).
export async function captureOAuthRedirect() {
  if (!window.location.hash.includes("access_token")) return;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (access_token && refresh_token) {
    await setSession({ access_token, refresh_token });
    emit("SIGNED_IN");
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
}

export async function verifyOtp(_args: unknown) {
  // OTP/magic-link verification — wire to /auth/verify when that endpoint is added.
  return { data: { user: null, session: null }, error: { message: "verifyOtp not yet implemented" } };
}

export function onAuthStateChange(cb: Listener) {
  listeners.add(cb);
  // Fire INITIAL_SESSION asynchronously, like Supabase.
  setTimeout(() => cb("INITIAL_SESSION", current), 0);
  return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
}

// Minimal MFA stub (mfa.enroll/challenge/verify/listFactors/unenroll are used in 5 places).
// Backed by the webauthn-* Workers once ported; throws clearly until then.
export const mfa = {
  async enroll(_a: unknown) { return { data: null, error: { message: "MFA enroll not yet ported" } }; },
  async challenge(_a: unknown) { return { data: null, error: { message: "MFA challenge not yet ported" } }; },
  async verify(_a: unknown) { return { data: null, error: { message: "MFA verify not yet ported" } }; },
  async listFactors() { return { data: { all: [], totp: [] }, error: null }; },
  async unenroll(_a: unknown) { return { data: null, error: { message: "MFA unenroll not yet ported" } }; },
};

export const authAdapter = {
  signInWithPassword, signUp, signOut, getSession, getUser, setSession,
  refreshSession, updateUser, signInWithOAuth, verifyOtp, onAuthStateChange, mfa,
};
export default authAdapter;
