import { useState, useEffect } from "react";
import { Clock, Monitor, MapPin, Shield, Plus, Trash2, X, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface LoginEntry {
  id: string;
  email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  status: string;
  created_at: string;
}

interface IpRestriction {
  id: string;
  ip_address: string;
  description: string | null;
  type: string;
  is_active: boolean;
}

export default function AdminSecurity() {
  const { user } = useAuth();
  const [loginHistory, setLoginHistory] = useState<LoginEntry[]>([]);
  const [ipRestrictions, setIpRestrictions] = useState<IpRestriction[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"history" | "ip">("history");
  const [search, setSearch] = useState("");

  // IP form
  const [showIpForm, setShowIpForm] = useState(false);
  const [ipForm, setIpForm] = useState({ ip_address: "", description: "", type: "whitelist" });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    const [histRes, ipRes] = await Promise.all([
      supabase.from("login_history").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("ip_restrictions").select("*").order("created_at", { ascending: false }),
    ]);
    if (histRes.data) setLoginHistory(histRes.data as LoginEntry[]);
    if (ipRes.data) setIpRestrictions(ipRes.data as IpRestriction[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const addIpRestriction = async () => {
    if (!ipForm.ip_address) { toast.error("IP address required"); return; }
    setSaving(true);
    const { error } = await supabase.from("ip_restrictions").insert({
      ip_address: ipForm.ip_address,
      description: ipForm.description || null,
      type: ipForm.type,
      created_by: user!.id,
    } as any);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("IP restriction added"); setShowIpForm(false); setIpForm({ ip_address: "", description: "", type: "whitelist" }); fetchData(); }
  };

  const deleteIpRestriction = async (id: string) => {
    const { error } = await supabase.from("ip_restrictions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Removed"); fetchData(); }
  };

  const filteredHistory = loginHistory.filter((l) =>
    (l.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (l.ip_address || "").includes(search)
  );

  if (loading) return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Security</h1>
        <p className="text-sm text-muted-foreground mt-1">Login history and IP restrictions</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
        <button onClick={() => setTab("history")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "history" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
          <Clock className="h-3.5 w-3.5 inline mr-1.5" />Login History
        </button>
        <button onClick={() => setTab("ip")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "ip" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
          <Shield className="h-3.5 w-3.5 inline mr-1.5" />IP Restrictions
        </button>
      </div>

      {tab === "history" && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input placeholder="Search by email or IP..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          <div className="space-y-2">
            {filteredHistory.map((l) => (
              <div key={l.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${l.status === "success" ? "bg-chart-2/10" : "bg-destructive/10"}`}>
                    <Monitor className={`h-4 w-4 ${l.status === "success" ? "text-chart-2" : "text-destructive"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{l.email || "Unknown"}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {l.ip_address || "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(l.created_at).toLocaleString()}
                      </span>
                    </div>
                    {l.user_agent && <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[300px]">{l.user_agent}</p>}
                  </div>
                </div>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${l.status === "success" ? "bg-chart-2/10 text-chart-2" : "bg-destructive/10 text-destructive"}`}>
                  {l.status}
                </span>
              </div>
            ))}
            {filteredHistory.length === 0 && <p className="text-center py-8 text-sm text-muted-foreground">No login history yet</p>}
          </div>
        </>
      )}

      {tab === "ip" && (
        <>
          <div className="flex justify-end">
            <button onClick={() => setShowIpForm(true)} className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
              <Plus className="h-4 w-4" /> Add Restriction
            </button>
          </div>

          {showIpForm && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Add IP Restriction</h3>
                <button onClick={() => setShowIpForm(false)} className="p-1 rounded-md text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">IP Address *</label><input value={ipForm.ip_address} onChange={(e) => setIpForm({ ...ipForm, ip_address: e.target.value })} placeholder="192.168.1.0/24" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Type</label><select value={ipForm.type} onChange={(e) => setIpForm({ ...ipForm, type: e.target.value })} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"><option value="whitelist">Whitelist</option><option value="blacklist">Blacklist</option></select></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Description</label><input value={ipForm.description} onChange={(e) => setIpForm({ ...ipForm, description: e.target.value })} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              </div>
              <button onClick={addIpRestriction} disabled={saving} className="flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">{saving ? "Adding..." : "Add"}</button>
            </div>
          )}

          <div className="space-y-2">
            {ipRestrictions.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${r.type === "whitelist" ? "bg-chart-2/10" : "bg-destructive/10"}`}>
                    <Shield className={`h-4 w-4 ${r.type === "whitelist" ? "text-chart-2" : "text-destructive"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground font-mono">{r.ip_address}</p>
                    <p className="text-xs text-muted-foreground">{r.type} {r.description ? `· ${r.description}` : ""}</p>
                  </div>
                </div>
                <button onClick={() => deleteIpRestriction(r.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            {ipRestrictions.length === 0 && <p className="text-center py-8 text-sm text-muted-foreground">No IP restrictions configured</p>}
          </div>
        </>
      )}
    </div>
  );
}
