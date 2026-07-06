import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/db";

export interface PlatformModule {
  name: string;
  label: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  route: string | null;
  is_premium: boolean | null;
  sort_order: number | null;
}

// Modules launched recently — surfaced in "What's New" strips and badges
export const NEW_MODULE_NAMES = new Set<string>([
  "social_agent",
  "visual_editor",
  "mobile_app",
  "portals",
  "ai_assistant",
  "meetings",
]);

export const CATEGORY_LABELS: Record<string, string> = {
  core: "Core Suite",
  ai: "AI & Automation",
  communication: "Communication",
  commerce: "Commerce & POS",
  finance: "Finance & Billing",
  hr: "HR & People",
  productivity: "Productivity",
  sales: "Sales",
  compliance: "Compliance & ESG",
  procurement: "Procurement & Supply",
  admin: "Admin & IT",
};

let cache: PlatformModule[] | null = null;
let cacheAt = 0;
const TTL = 10 * 60 * 1000;

const FALLBACK_ROUTES: Record<string, string> = {
  hrms: "/features/hrm",
  product_hub: "/features/pos",
  ai_assistant: "/features/ai",
};

function normalizeRoute(m: PlatformModule): string {
  if (m.route) return m.route;
  if (FALLBACK_ROUTES[m.name]) return FALLBACK_ROUTES[m.name];
  return `/features/${m.name.replace(/_/g, "-")}`;
}

export function usePlatformModules() {
  const [modules, setModules] = useState<PlatformModule[]>(cache || []);
  const [isLoading, setIsLoading] = useState(!cache);

  useEffect(() => {
    if (cache && Date.now() - cacheAt < TTL) return;
    setIsLoading(true);
    supabase
      .from("platform_modules")
      .select("name,label,description,icon,category,route,is_premium,sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data) {
          cache = data as PlatformModule[];
          cacheAt = Date.now();
          setModules(cache);
        }
        setIsLoading(false);
      });
  }, []);

  const byCategory: Record<string, PlatformModule[]> = {};
  for (const m of modules) {
    const k = m.category || "core";
    (byCategory[k] = byCategory[k] || []).push(m);
  }

  const newModules = modules.filter((m) => NEW_MODULE_NAMES.has(m.name));
  const getByName = (name: string) => modules.find((m) => m.name === name);

  return {
    modules,
    byCategory,
    newModules,
    getByName,
    isLoading,
    routeFor: normalizeRoute,
  };
}
