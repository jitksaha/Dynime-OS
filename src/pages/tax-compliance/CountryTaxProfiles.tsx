import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Search, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";

interface TaxProfile {
  id: string;
  country: string;
  name: string;
  region: string;
  tax_system: string;
  fiscal_year_start: string;
  filing_frequency: string;
  default_tax_rate: number;
  currency: string;
  notes: string | null;
  is_active: boolean;
  is_default: boolean;
}

const TAX_SYSTEMS = ["vat", "gst", "sales_tax", "hybrid"];
const FREQUENCIES = ["monthly", "quarterly", "annually"];

export default function CountryTaxProfiles() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [profiles, setProfiles] = useState<TaxProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TaxProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    country: "", name: "", region: "", tax_system: "vat",
    fiscal_year_start: "01-01", filing_frequency: "quarterly",
    default_tax_rate: 0, currency: "USD", notes: "", is_active: true, is_default: false,
  });

  const fetchProfiles = async () => {
    if (!tenantId) return;
    const { data, error } = await supabase
      .from("tax_profiles")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("country");
    if (error) toast.error("Failed to load profiles");
    else setProfiles((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchProfiles(); }, [tenantId]);

  const handleSave = async () => {
    if (!form.country || !form.name || !form.region) {
      toast.error("Country, name, and region are required");
      return;
    }
    setSaving(true);
    if (editing) {
      const { error } = await supabase
        .from("tax_profiles")
        .update({ ...form, updated_at: new Date().toISOString() } as any)
        .eq("id", editing.id);
      if (error) toast.error("Failed to update");
      else { toast.success("Tax profile updated"); resetForm(); fetchProfiles(); }
    } else {
      const { error } = await supabase
        .from("tax_profiles")
        .insert({ ...form, tenant_id: tenantId, created_by: user?.id } as any);
      if (error) toast.error("Failed to create: " + error.message);
      else { toast.success("Tax profile created"); resetForm(); fetchProfiles(); }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("tax_profiles").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else { toast.success("Deleted"); fetchProfiles(); }
  };

  const resetForm = () => {
    setForm({ country: "", name: "", region: "", tax_system: "vat", fiscal_year_start: "01-01", filing_frequency: "quarterly", default_tax_rate: 0, currency: "USD", notes: "", is_active: true, is_default: false });
    setEditing(null);
    setShowForm(false);
  };

  const startEdit = (p: TaxProfile) => {
    setEditing(p);
    setForm({
      country: p.country, name: p.name, region: p.region, tax_system: p.tax_system || "vat",
      fiscal_year_start: p.fiscal_year_start || "01-01", filing_frequency: p.filing_frequency || "quarterly",
      default_tax_rate: p.default_tax_rate || 0, currency: p.currency || "USD",
      notes: p.notes || "", is_active: p.is_active !== false, is_default: p.is_default || false,
    });
    setShowForm(true);
  };

  const filtered = profiles.filter(
    (p) =>
      p.country.toLowerCase().includes(search.toLowerCase()) ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.region.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Country Tax Profiles</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure tax systems per country/region</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(!showForm); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Profile
        </Button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">{editing ? "Edit" : "New"} Tax Profile</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Country Code</label>
              <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase() })} placeholder="US" maxLength={3} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Profile Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="US Federal Tax" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Region</label>
              <input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="Federal" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tax System</label>
              <select value={form.tax_system} onChange={(e) => setForm({ ...form, tax_system: e.target.value })} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm">
                {TAX_SYSTEMS.map((s) => <option key={s} value={s}>{s.toUpperCase().replace("_", " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Default Rate (%)</label>
              <input type="number" step="0.001" value={form.default_tax_rate} onChange={(e) => setForm({ ...form, default_tax_rate: parseFloat(e.target.value) || 0 })} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Filing Frequency</label>
              <select value={form.filing_frequency} onChange={(e) => setForm({ ...form, filing_frequency: e.target.value })} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm">
                {FREQUENCIES.map((f) => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Currency</label>
              <input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} placeholder="USD" maxLength={3} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Fiscal Year Start</label>
              <input value={form.fiscal_year_start} onChange={(e) => setForm({ ...form, fiscal_year_start: e.target.value })} placeholder="01-01" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" /> Active
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} className="rounded" /> Default Profile
            </label>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} loading={saving}><Save className="h-4 w-4 mr-2" /> {editing ? "Update" : "Create"}</Button>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search profiles..." className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-background text-sm" />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Country</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">System</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rate</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Frequency</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-mono text-foreground">{p.country}</td>
                <td className="px-4 py-3 text-foreground">{p.name} {p.is_default && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded ml-1">Default</span>}</td>
                <td className="px-4 py-3 text-foreground uppercase">{(p.tax_system || "vat").replace("_", " ")}</td>
                <td className="px-4 py-3 text-foreground">{p.default_tax_rate || 0}%</td>
                <td className="px-4 py-3 text-foreground capitalize">{p.filing_frequency || "quarterly"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active !== false ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
                    {p.is_active !== false ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => startEdit(p)} className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"><Edit2 className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-md text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">No tax profiles found. Add one to get started.</div>}
      </div>
      <p className="text-xs text-muted-foreground">{profiles.length} profiles configured</p>
    </div>
  );
}
