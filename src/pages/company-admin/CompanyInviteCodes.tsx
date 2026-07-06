import { useState, useEffect } from "react";
import { KeyRound, Plus, Copy, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface InviteCode {
  id: string;
  code: string;
  role: string;
  department: string | null;
  max_uses: number;
  used_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 8; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

export default function CompanyInviteCodes() {
  const { profile } = useAuth();
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [department, setDepartment] = useState("");
  const [maxUses, setMaxUses] = useState(0);

  const tenantId = profile?.tenant_id;

  const fetchCodes = async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("company_invite_codes")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    setCodes((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCodes();
  }, [tenantId]);

  const handleCreate = async () => {
    if (!tenantId) return;
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const code = generateCode();
    const { error } = await supabase.from("company_invite_codes").insert({
      tenant_id: tenantId,
      code,
      created_by: user.id,
      role: "employee" as any,
      department: department || null,
      max_uses: maxUses,
    } as any);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Invite code created: ${code}`);
      setDepartment("");
      setMaxUses(0);
      fetchCodes();
    }
    setCreating(false);
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied to clipboard");
  };

  const handleDeactivate = async (id: string) => {
    await supabase.from("company_invite_codes").update({ is_active: false } as any).eq("id", id);
    toast.success("Code deactivated");
    fetchCodes();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Invite Codes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate invite codes for employees to join your company workspace.
        </p>
      </div>

      {/* Create new code */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Plus className="h-4 w-4" /> Generate New Code
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Department (optional)</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Engineering"
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Max Uses (0 = unlimited)</label>
            <input
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(parseInt(e.target.value) || 0)}
              min={0}
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-full h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Generate
            </button>
          </div>
        </div>
      </div>

      {/* Codes list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : codes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No invite codes created yet. Generate one above.
        </div>
      ) : (
        <div className="space-y-2">
          {codes.map((c) => (
            <div
              key={c.id}
              className={`flex items-center justify-between p-4 rounded-xl border ${
                c.is_active ? "border-border bg-card" : "border-border/50 bg-muted/30 opacity-60"
              }`}
            >
              <div className="flex items-center gap-4">
                <code className="text-base font-mono font-bold tracking-widest text-foreground">{c.code}</code>
                <div className="hidden sm:flex items-center gap-2">
                  {c.department && (
                    <span className="px-2 py-0.5 rounded-md bg-secondary text-xs text-muted-foreground">{c.department}</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Used: {c.used_count}{c.max_uses > 0 ? `/${c.max_uses}` : ""}
                  </span>
                  {!c.is_active && (
                    <span className="px-2 py-0.5 rounded-md bg-destructive/10 text-destructive text-xs">Inactive</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {c.is_active && (
                  <>
                    <button onClick={() => handleCopy(c.code)} className="p-2 rounded-md text-muted-foreground hover:bg-secondary" title="Copy">
                      <Copy className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDeactivate(c.id)} className="p-2 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Deactivate">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
