// Data client. Configuration is env-driven (see .env / Cloudflare Pages env vars).
//
// Migration note (infra/): during the Cloudflare cutover this file is the single
// swap point. Today it talks to Supabase using values from VITE_SUPABASE_*. When
// VITE_API_BASE_URL is set and VITE_USE_WORKERS=true, point the same client at our
// Workers API instead (PostgREST-compatible /rest/v1) and swap `auth`/`functions`
// for the adapters in infra/frontend/. See infra/CUTOVER.md.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  "https://msibxlvqeydgmlofwlbx.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zaWJ4bHZxZXlkZ21sb2Z3bGJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NzcxMzcsImV4cCI6MjA5MTA1MzEzN30.iirvfS9v25c_Lp-ynokpq8EmQ6kxKN9sS8UHZtN257U";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
