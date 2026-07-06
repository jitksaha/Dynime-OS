import { supabase } from "@/integrations/supabase/db";
import type { Session } from "@supabase/supabase-js";

export async function stabilizeAuthSession(session: Session): Promise<void> {
  await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const {
      data: { session: restoredSession },
    } = await supabase.auth.getSession();

    if (restoredSession?.user?.id === session.user.id) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 150));
  }
}

export async function resolvePostAuthPath(userId: string, fallbackRole?: string | null): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("user_id", userId)
    .maybeSingle();

  if (!profile?.onboarding_completed) {
    return "/onboarding";
  }

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  const roleSet = new Set((roles ?? []).map((row) => row.role));
  const resolvedRole = roleSet.has("employee")
    ? "employee"
    : roleSet.has("customer")
      ? "customer"
      : fallbackRole ?? null;

  if (resolvedRole === "employee") {
    return "/portal/employee";
  }

  if (resolvedRole === "customer") {
    return "/portal/customer";
  }

  return "/dashboard";
}

export function extractTokenHashFromActionLink(actionLink: string): { tokenHash: string | null; type: string } {
  const parsedUrl = new URL(actionLink);

  const tokenHash =
    parsedUrl.searchParams.get("token_hash") ||
    parsedUrl.searchParams.get("token") ||
    null;

  return {
    tokenHash,
    type: parsedUrl.searchParams.get("type") || "magiclink",
  };
}
