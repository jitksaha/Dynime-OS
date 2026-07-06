import DOMPurify from "dompurify";

// ========== Rate Limiting ==========
interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const RATE_LIMIT_CONFIG = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  lockoutMs: 15 * 60 * 1000, // 15 minute lockout
};

export function checkRateLimit(key: string): { allowed: boolean; remainingAttempts: number; lockoutSecondsLeft: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry) {
    return { allowed: true, remainingAttempts: RATE_LIMIT_CONFIG.maxAttempts, lockoutSecondsLeft: 0 };
  }

  // Check if locked out
  if (entry.lockedUntil && now < entry.lockedUntil) {
    const lockoutSecondsLeft = Math.ceil((entry.lockedUntil - now) / 1000);
    return { allowed: false, remainingAttempts: 0, lockoutSecondsLeft };
  }

  // Reset if window expired
  if (now - entry.firstAttempt > RATE_LIMIT_CONFIG.windowMs) {
    rateLimitStore.delete(key);
    return { allowed: true, remainingAttempts: RATE_LIMIT_CONFIG.maxAttempts, lockoutSecondsLeft: 0 };
  }

  const remaining = RATE_LIMIT_CONFIG.maxAttempts - entry.attempts;
  return { allowed: remaining > 0, remainingAttempts: Math.max(0, remaining), lockoutSecondsLeft: 0 };
}

export function recordLoginAttempt(key: string, success: boolean): void {
  const now = Date.now();

  if (success) {
    rateLimitStore.delete(key);
    return;
  }

  const entry = rateLimitStore.get(key);

  if (!entry || now - entry.firstAttempt > RATE_LIMIT_CONFIG.windowMs) {
    rateLimitStore.set(key, { attempts: 1, firstAttempt: now, lockedUntil: null });
    return;
  }

  entry.attempts += 1;
  if (entry.attempts >= RATE_LIMIT_CONFIG.maxAttempts) {
    entry.lockedUntil = now + RATE_LIMIT_CONFIG.lockoutMs;
  }
}

// ========== Password Strength ==========
export interface PasswordStrength {
  score: number; // 0-4
  label: "Very Weak" | "Weak" | "Fair" | "Strong" | "Very Strong";
  color: string;
  suggestions: string[];
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  let score = 0;
  const suggestions: string[] = [];

  if (password.length >= 8) score++;
  else suggestions.push("Use at least 8 characters");

  if (password.length >= 12) score++;

  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  else suggestions.push("Mix uppercase and lowercase letters");

  if (/\d/.test(password)) score++;
  else suggestions.push("Add a number");

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;
  else suggestions.push("Add a special character");

  // Penalize common patterns
  if (/^(12345|password|qwerty|abc123)/i.test(password)) {
    score = Math.max(0, score - 2);
    suggestions.push("Avoid common passwords");
  }

  const capped = Math.min(4, score) as 0 | 1 | 2 | 3 | 4;

  const labels: Record<number, PasswordStrength["label"]> = {
    0: "Very Weak", 1: "Weak", 2: "Fair", 3: "Strong", 4: "Very Strong",
  };

  const colors: Record<number, string> = {
    0: "hsl(0, 72%, 51%)",    // red
    1: "hsl(25, 95%, 53%)",   // orange
    2: "hsl(48, 96%, 53%)",   // yellow
    3: "hsl(142, 71%, 45%)",  // green
    4: "hsl(160, 84%, 39%)",  // teal
  };

  return { score: capped, label: labels[capped], color: colors[capped], suggestions };
}

// ========== Input Sanitization ==========
export function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "code", "pre"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
}

// ========== Email Validation ==========
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254;
}

// ========== Session Security ==========
export function getSessionFingerprint(): string {
  const nav = window.navigator;
  const parts = [
    nav.userAgent,
    nav.language,
    new Date().getTimezoneOffset().toString(),
    screen.width + "x" + screen.height,
  ];
  return btoa(parts.join("|")).slice(0, 32);
}
