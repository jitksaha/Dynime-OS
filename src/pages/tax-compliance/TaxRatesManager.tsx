import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Search, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";

interface TaxRate {
  id: string;
  name: string;
  rate: number;
  tax_type: string;
  rate_type: string;
  applies_to: string;
  is_active: boolean;
  is_compound: boolean;
  effective_from: string | null;
  effective_until: string | null;
  tax_profile_id: string;
}

interface TaxProfile { id: string; name: string; country: string; }

const TAX_CATEGORIES = ["vat", "sales_tax", "service_tax", "excise", "customs", "withholding", "other"];
const RATE_TYPES = ["percentage", "flat", "compound"];
const APPLIES_OPTIONS = ["all", "goods", "services", "imports", "exports"];

export default function TaxRatesManager() {
  const { tenantId } = useTenant();
  const [rates, setRates] = useState<TaxRate[]>([]);
  const [profiles, setProfiles] = useState<TaxProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TaxRate | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", rate: 0, tax_type: "vat", rate_type: "percentage",
    applies_to: "all", is_active: true, is_compound: false,
    effective_from: "", effective_until: "", tax_profile_id: "",
  });

  const fetchData = async () => {
    if (!tenantId) return;
    const [ratesRes, profilesRes] = await Promise.all([
      supabase.from("tax_rates").select("*").eq("tenant_id", tenantId).order("name"),
      supabase.from("tax_profiles").select("id, name, country").eq("tenant_id", tenantId).order("name"),
    ]);
    setRates((ratesRes.data as any[]) || []);
    setProfiles((profilesRes.data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [tenantId]);

  const handleSave = async () => {
    if (!form.name || !form.tax_profile_id) { toast.error("Name and profile are required"); return; }
    setSaving(true);
    const payload: any = {
      ...form, rate: form.rate,
      effective_from: form.effective_from || null,
      effective_until: form.effective_until || null,
      tenant_id: tenantId,
    };
    if (editing) {
      const { error } = await supabase.from("tax_rates").update(payload).eq("id", editing.id);
      if (error) toast.error("Failed to update"); else { toast.success("Rate updated"); resetForm(); fetchData(); }
    } else {
      const { error } = await supabase.from("tax_rates").insert(payload);
      if (error) toast.error("Failed to create: " + error.message); else { toast.success("Rate created"); resetForm(); fetchData(); }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("tax_rates").delete().eq("id", id);
    if (error) toast.error("Failed to delete"); else { toast.success("Deleted"); fetchData(); }
  };

  const resetForm = () => {
    setForm({ name: "", rate: 0, tax_type: "vat", rate_type: "percentage", applies_to: "all", is_active: true, is_compound: false, effective_from: "", effective_until: "", tax_profile_id: profiles[0]?.id || "" });
    setEditing(null); setShowForm(false);
  };

  const startEdit = (r: TaxRate) => {
    setEditing(r);
    setForm({
      name: r.name, rate: r.rate, tax_type: r.tax_type || "vat", rate_type: r.rate_type || "percentage",
      applies_to: r.applies_to || "all", is_active: r.is_active !== false, is_compound: r.is_compound || false,
      effective_from: r.effective_from || "", effective_until: r.effective_until || "", tax_profile_id: r.tax_profile_id,
    });
    setShowForm(true);
  };

  const filtered = rates.filter((r) => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.tax_type.toLowerCase().includes(search.toLowerCase());
    const matchProfile = selectedProfile === "all" || r.tax_profile_id === selectedProfile;
    return matchSearch && matchProfile;
  });

  const getProfileName = (id: string) => profiles.find((p) => p.id === id)?.name || "—";

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Tax Rates</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage VAT, sales tax, and other tax rates per country</p>
        </div>
        <Button onClick={() => { resetForm(); setForm((f) => ({ ...f, tax_profile_id: profiles[0]?.id || "" })); setShowForm(!showForm); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Rate
        </Button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">{editing ? "Edit" : "New"} Tax Rate</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tax Profile</label>
              <select value={form.tax_profile_id} onChange={(e) => setForm({ ...form, tax_profile_id: e.target.value })} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm">
                <option value="">Select profile...</option>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.country})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Standard VAT" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Rate (%)</label>
              <input type="number" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: parseFloat(e.target.value) || 0 })} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Category</label>
              <select value={form.tax_type} onChange={(e) => setForm({ ...form, tax_type: e.target.value })} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm">
                {TAX_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ").toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Rate Type</label>
              <select value={form.rate_type} onChange={(e) => setForm({ ...form, rate_type: e.target.value })} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm">
                {RATE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Applies To</label>
              <select value={form.applies_to} onChange={(e) => setForm({ ...form, applies_to: e.target.value })} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm">
                {APPLIES_OPTIONS.map((a) => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Effective From</label>
              <input type="date" value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Effective Until</label>
              <input type="date" value={form.effective_until} onChange={(e) => setForm({ ...form, effective_until: e.target.value })} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_compound} onChange={(e) => setForm({ ...form, is_compound: e.target.checked })} /> Compound</label>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} loading={saving}><Save className="h-4 w-4 mr-2" /> {editing ? "Update" : "Create"}</Button>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search rates..." className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-background text-sm" />
        </div>
        <select value={selectedProfile} onChange={(e) => setSelectedProfile(e.target.value)} className="h-10 px-4 rounded-lg border border-input bg-background text-sm">
          <option value="all">All Profiles</option>
          {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Profile</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rate</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Applies To</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-foreground font-medium">{r.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{getProfileName(r.tax_profile_id)}</td>
                <td className="px-4 py-3 text-foreground uppercase text-xs">{(r.tax_type || "vat").replace("_", " ")}</td>
                <td className="px-4 py-3 text-foreground font-mono">{r.rate}%{r.is_compound && " (C)"}</td>
                <td className="px-4 py-3 text-foreground capitalize">{r.applies_to || "all"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.is_active !== false ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
                    {r.is_active !== false ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => startEdit(r)} className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"><Edit2 className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-md text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">No tax rates found</div>}
      </div>
    </div>
  );
}
