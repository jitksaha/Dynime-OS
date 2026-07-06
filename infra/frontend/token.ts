// Tiny helper shared by the auth adapter and the invoke shim: read the current
// access token from the persisted session (same STORAGE_KEY as auth-adapter.ts).

const STORAGE_KEY = "dynime.auth.session";

export function getAccessToken(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as { access_token?: string }).access_token ?? null;
  } catch {
    return null;
  }
}
