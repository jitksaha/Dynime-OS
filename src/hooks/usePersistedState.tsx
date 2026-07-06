import { useState, useEffect, useRef, Dispatch, SetStateAction } from "react";

/**
 * useState that auto-persists to localStorage.
 * Survives page reloads, accidental refreshes, and tab restores.
 *
 * @param key      Unique localStorage key (namespace it per-feature, e.g. "onboarding:companyName")
 * @param initial  Initial value when nothing is stored yet
 * @param options  { debounceMs?: number; disabled?: boolean }
 */
export function usePersistedState<T>(
  key: string,
  initial: T,
  options: { debounceMs?: number; disabled?: boolean } = {}
): [T, Dispatch<SetStateAction<T>>, () => void] {
  const { debounceMs = 300, disabled = false } = options;

  const [value, setValue] = useState<T>(() => {
    if (disabled || typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initial;
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  });

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (disabled || typeof window === "undefined") return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Quota exceeded or serialization error — silently ignore
      }
    }, debounceMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [key, value, debounceMs, disabled]);

  const clear = () => {
    try {
      window.localStorage.removeItem(key);
    } catch {}
  };

  return [value, setValue, clear];
}

/** Clear multiple persisted keys at once (e.g., after successful submit) */
export function clearPersistedKeys(keys: string[]) {
  keys.forEach((k) => {
    try {
      window.localStorage.removeItem(k);
    } catch {}
  });
}
