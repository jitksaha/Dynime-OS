/**
 * Auto-discovered Page Index
 * --------------------------
 * Builds a single searchable index of every page/feature in the app
 * by merging two sources of truth:
 *
 *   1. The sidebar navigation tree (rich labels, icons, groups)
 *   2. Every <Route path="…"> declared in App.tsx (caught at module load)
 *
 * New routes/sidebar items become searchable automatically — no manual list.
 *
 * Sidebar nav has priority for labels & icons; routes that are not in the
 * sidebar get a humanised label derived from the path segment.
 */
import type { LucideIcon } from "lucide-react";
import { File as FileIcon } from "lucide-react";
import { getSearchIcon } from "@/lib/search-icons";

export interface PageIndexItem {
  id: string;            // unique key (the path)
  label: string;         // user-facing title
  path: string;
  group: string;         // category for grouping (e.g. "HRM", "Accounting")
  icon: LucideIcon;
  keywords: string[];    // additional matchable terms (humanised path tokens)
  source: "sidebar" | "route";
}

// ── Internal global stores populated at runtime ────────────────────────────
const sidebarStore = new Map<string, PageIndexItem>();
const routeStore = new Map<string, PageIndexItem>();
const listeners = new Set<() => void>();
let cachedSnapshot: PageIndexItem[] = [];
let snapshotDirty = true;

function notify() {
  snapshotDirty = true;
  listeners.forEach((fn) => fn());
}

// Humanise "/hrm/salary-sheet" → "Salary Sheet" and group "HRM"
function humanise(path: string): { label: string; group: string; keywords: string[] } {
  const clean = path.replace(/^\/+/, "").replace(/\/:.*$/, "");
  const parts = clean.split("/").filter(Boolean);
  if (parts.length === 0) return { label: "Home", group: "App", keywords: [] };
  const last = parts[parts.length - 1];
  const label = last
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
  const group = parts[0]
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
  const keywords = clean.split(/[/_-]/).filter(Boolean);
  return { label, group, keywords };
}

// Routes we never want in the search results
const EXCLUDED_PREFIXES = [
  "/admin",        // super-admin area has its own search
  "/auth",
  "/login",
  "/signup",
  "/forgot-password",
  "/onboarding",
  "/join-company",
  "/superadmin",
  "/checkout",
  "/invite",
  "/api/docs",
  "/portal",       // public-facing portals
  "/book/",
  "/careers/",
  "/blog",
  "/partners",
  "/features/",
  "/solutions/",
  "/tools/",
  "/contact",
  "/about",
  "/help",
  "/privacy",
  "/terms",
  "/refund",
  "/disclaimer",
  "/cookies",
  "/acceptable-use",
  "/dpa",
  "/pricing",
  "/app-download",
  "/testimonials",
];

function isPublicOrExcluded(path: string): boolean {
  if (path === "/" || path.includes(":")) return true;
  return EXCLUDED_PREFIXES.some((p) => path === p || path.startsWith(p));
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Register a sidebar item (called by AppSidebar on mount).
 * Sidebar registrations win over auto-derived route entries.
 */
export function registerSidebarItem(item: {
  label: string;
  path: string;
  group: string;
  icon: LucideIcon;
}) {
  if (isPublicOrExcluded(item.path)) return;
  const { keywords } = humanise(item.path);
  sidebarStore.set(item.path, {
    id: item.path,
    label: item.label,
    path: item.path,
    group: item.group,
    icon: item.icon,
    keywords: [...keywords, item.label.toLowerCase()],
    source: "sidebar",
  });
  notify();
}

/**
 * Bulk-register sidebar items at once. Replaces previous sidebar entries.
 */
export function registerSidebarTree(
  items: Array<{ label: string; path: string; group: string; icon: LucideIcon }>
) {
  sidebarStore.clear();
  items.forEach(registerSidebarItem);
}

/**
 * Register a route discovered in App.tsx.
 * Called by the small wrapper around <Route> below.
 */
export function registerRoute(path: string) {
  if (isPublicOrExcluded(path)) return;
  if (routeStore.has(path)) return;
  const { label, group, keywords } = humanise(path);
  routeStore.set(path, {
    id: path,
    label,
    path,
    group,
    icon: FileIcon,
    keywords,
    source: "route",
  });
  notify();
}

/** Bulk variant. */
export function registerRoutes(paths: string[]) {
  paths.forEach(registerRoute);
}

/**
 * Returns the merged, deduplicated, fully-built page index.
 * Sidebar entries always shadow route-only entries with the same path.
 */
export function getPageIndex(): PageIndexItem[] {
  if (!snapshotDirty) return cachedSnapshot;
  const merged = new Map<string, PageIndexItem>();
  // routes first (lower priority)
  routeStore.forEach((v, k) => merged.set(k, v));
  // sidebar overrides
  sidebarStore.forEach((v, k) => merged.set(k, v));
  cachedSnapshot = Array.from(merged.values());
  snapshotDirty = false;
  return cachedSnapshot;
}

/** Subscribe to index changes (used by useSyncExternalStore). */
export function subscribeIndex(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Expose the icon resolver for db-results consumers
export { getSearchIcon };
