/**
 * Centralised AI error → user-friendly message translator.
 * Detects platform AI provider issues (quota / rate limit / billing / invalid key)
 * and returns a consistent friendly message.
 */
export const PLATFORM_AI_ERROR_MESSAGE =
  "⚠️ Platform AI is currently experiencing an error. Please wait — we're working to fix it.";

export function getAIErrorMessage(error: any, fallback = "AI request failed. Please try again."): string {
  if (!error) return fallback;

  const status = error?.status ?? error?.context?.status ?? error?.response?.status;
  const raw =
    error?.message ||
    error?.error ||
    error?.context?.body ||
    (typeof error === "string" ? error : "") ||
    "";
  const text = String(raw).toLowerCase();

  const isPlatformIssue =
    status === 429 ||
    status === 402 ||
    status === 401 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    text.includes("rate limit") ||
    text.includes("quota") ||
    text.includes("insufficient_quota") ||
    text.includes("credits") ||
    text.includes("billing") ||
    text.includes("ai provider") ||
    text.includes("ai service") ||
    text.includes("invalid api key") ||
    text.includes("unauthorized") ||
    text.includes("non-2xx");

  if (isPlatformIssue) return PLATFORM_AI_ERROR_MESSAGE;
  return error?.message || fallback;
}
