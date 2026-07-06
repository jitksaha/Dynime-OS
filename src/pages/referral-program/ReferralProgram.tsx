// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { Share2, Plus, Users, TrendingUp, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

interface Campaign { id: string; name: string; reward_type: string; reward_value: number; max_referrals: number; is_active: boolean; total_referrals: number; total_conversions: number; created_at: string; }

export default function ReferralProgram() {
  const { tenantId, userId } = useTenant();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", reward_type: "discount", reward_value: "10", max_referrals: "-1" });

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("referral_campaigns" as any).select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    setCampaigns((data as any[]) || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createCampaign = async () => {
    if (!form.name || !tenantId) return;
    const { error } = await supabase.from("referral_campaigns" as any).insert({
      name: form.name, reward_type: form.reward_type, reward_value: Number(form.reward_value),
      max_referrals: Number(form.max_referrals), tenant_id: tenantId, created_by: userId,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Campaign created");
    setShowForm(false);
    fetchData();
  };

  const totalRefs = campaigns.reduce((a, c) => a + c.total_referrals, 0);
  const totalConversions = campaigns.reduce((a, c) => a + c.total_conversions, 0);
  const convRate = totalRefs > 0 ? ((totalConversions / totalRefs) * 100).toFixed(1) : "0";

  if (loading) return <div className="flex justify-center py-20"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Share2 className="h-6 w-6 text-primary" /> Referral Program</h1>
          <p className="text-sm text-muted-foreground mt-1">Shareable referral links with automated reward distribution</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"><Plus className="h-4 w-4" /> New Campaign</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-foreground">{campaigns.length}</p><p className="text-xs text-muted-foreground">Campaigns</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-primary">{totalRefs}</p><p className="text-xs text-muted-foreground">Total Referrals</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-success">{totalConversions}</p><p className="text-xs text-muted-foreground">Conversions</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-foreground">{convRate}%</p><p className="text-xs text-muted-foreground">Conv. Rate</p></div>
      </div>

      {showForm && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <p className="text-sm font-semibold">New Referral Campaign</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Campaign name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            <select value={form.reward_type} onChange={e => setForm(p => ({ ...p, reward_type: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="discount">Discount %</option><option value="credit">Account Credit</option><option value="cash">Cash Reward</option><option value="points">Loyalty Points</option>
            </select>
            <input type="number" placeholder="Reward value" value={form.reward_value} onChange={e => setForm(p => ({ ...p, reward_value: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            <input type="number" placeholder="Max referrals (-1 = unlimited)" value={form.max_referrals} onChange={e => setForm(p => ({ ...p, max_referrals: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={createCampaign} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Create</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {campaigns.length === 0 ? (
          <div className="text-center py-12"><Share2 className="h-10 w-10 text-muted-foreground mx-auto mb-2" /><p className="text-muted-foreground">No referral campaigns yet</p></div>
        ) : campaigns.map(c => (
          <div key={c.id} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
            <Share2 className={`h-5 w-5 ${c.is_active ? "text-primary" : "text-muted-foreground"}`} />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.reward_type}: {c.reward_value} · {c.total_referrals} refs → {c.total_conversions} conv.</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_active ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground"}`}>{c.is_active ? "Active" : "Paused"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
