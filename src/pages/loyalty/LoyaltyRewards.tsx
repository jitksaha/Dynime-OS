// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { Gift, Plus, Crown, Users, Star, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

interface Program { id: string; name: string; points_per_currency: number; tiers: any[]; is_active: boolean; created_at: string; }
interface Member { id: string; program_id: string; customer_name: string; customer_email: string; points_balance: number; total_earned: number; total_redeemed: number; tier: string; joined_at: string; }

const TIER_COLORS: Record<string, string> = { Bronze: "text-amber-700 bg-amber-100", Silver: "text-gray-600 bg-gray-100", Gold: "text-yellow-600 bg-yellow-100", Platinum: "text-purple-600 bg-purple-100" };

export default function LoyaltyRewards() {
  const { tenantId, userId } = useTenant();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"programs" | "members">("programs");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", points_per_currency: "1" });

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    const [p, m] = await Promise.all([
      supabase.from("loyalty_programs" as any).select("*").eq("tenant_id", tenantId),
      supabase.from("loyalty_members" as any).select("*").eq("tenant_id", tenantId).order("points_balance", { ascending: false }),
    ]);
    setPrograms((p.data as any[]) || []);
    setMembers((m.data as any[]) || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createProgram = async () => {
    if (!form.name || !tenantId) return;
    const { error } = await supabase.from("loyalty_programs" as any).insert({
      name: form.name, points_per_currency: Number(form.points_per_currency) || 1,
      tenant_id: tenantId, created_by: userId,
      tiers: [{ name: "Bronze", min_points: 0 }, { name: "Silver", min_points: 500 }, { name: "Gold", min_points: 2000 }, { name: "Platinum", min_points: 5000 }],
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Program created");
    setShowForm(false);
    fetchData();
  };

  const totalPoints = members.reduce((a, m) => a + m.total_earned, 0);

  if (loading) return <div className="flex justify-center py-20"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Gift className="h-6 w-6 text-primary" /> Loyalty & Rewards</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage points-based loyalty programs and membership tiers</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          <Plus className="h-4 w-4" /> New Program
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-foreground">{programs.length}</p><p className="text-xs text-muted-foreground">Programs</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-foreground">{members.length}</p><p className="text-xs text-muted-foreground">Members</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-primary">{totalPoints.toLocaleString()}</p><p className="text-xs text-muted-foreground">Points Issued</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-success">{members.reduce((a, m) => a + m.total_redeemed, 0).toLocaleString()}</p><p className="text-xs text-muted-foreground">Points Redeemed</p></div>
      </div>

      {showForm && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <p className="text-sm font-semibold">New Loyalty Program</p>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Program name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            <input placeholder="Points per currency unit" value={form.points_per_currency} onChange={e => setForm(p => ({ ...p, points_per_currency: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={createProgram} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Create</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex gap-1 border-b border-border">
        {(["programs", "members"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
            {tab === "programs" ? "Programs" : "Members"}
          </button>
        ))}
      </div>

      {activeTab === "programs" ? (
        <div className="space-y-3">
          {programs.map(prog => (
            <div key={prog.id} className="p-5 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Crown className="h-5 w-5 text-primary" />
                  <div><p className="font-medium text-foreground">{prog.name}</p><p className="text-xs text-muted-foreground">{prog.points_per_currency} pts per unit · {members.filter(m => m.program_id === prog.id).length} members</p></div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${prog.is_active ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground"}`}>{prog.is_active ? "Active" : "Paused"}</span>
              </div>
              <div className="flex gap-2">
                {(prog.tiers as any[])?.map((t: any) => (
                  <span key={t.name} className={`text-xs px-2 py-1 rounded-md font-medium ${TIER_COLORS[t.name] || "bg-secondary text-foreground"}`}>{t.name} ({t.min_points}+)</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {members.length === 0 ? (
            <div className="text-center py-12"><Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" /><p className="text-muted-foreground">No members yet</p></div>
          ) : members.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{m.customer_name.charAt(0)}</div>
              <div className="flex-1"><p className="text-sm font-medium text-foreground">{m.customer_name}</p><p className="text-xs text-muted-foreground">{m.customer_email}</p></div>
              <div className="text-right"><p className="text-sm font-bold text-foreground">{m.points_balance.toLocaleString()} pts</p></div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_COLORS[m.tier] || "bg-secondary text-foreground"}`}>{m.tier}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
