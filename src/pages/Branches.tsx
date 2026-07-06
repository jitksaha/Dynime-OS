import { useEffect, useState } from "react";
import { Building2, Plus, Trash2, Star, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { useActiveBranch } from "@/hooks/useActiveBranch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import BranchAccessDialog from "@/components/BranchAccessDialog";

export default function Branches() {
  const { profile } = useAuth();
  const { refresh } = useActiveBranch();
  const tenantId = (profile as any)?.tenant_id;
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", address: "", phone: "", email: "", timezone: "UTC" });
  const [accessBranch, setAccessBranch] = useState<{ id: string; name: string } | null>(null);

  const load = async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("branches").select("*").eq("tenant_id", tenantId).order("is_default", { ascending: false }).order("name");
    setRows(data || []);
  };
  useEffect(() => { load(); }, [tenantId]);

  const create = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    const { error } = await supabase.from("branches").insert({ ...form, tenant_id: tenantId });
    if (error) return toast.error(error.message);
    toast.success("Branch created");
    setOpen(false);
    setForm({ name: "", code: "", address: "", phone: "", email: "", timezone: "UTC" });
    await load(); await refresh();
  };

  const setDefault = async (id: string) => {
    await supabase.from("branches").update({ is_default: false }).eq("tenant_id", tenantId);
    await supabase.from("branches").update({ is_default: true }).eq("id", id);
    toast.success("Default branch updated");
    await load(); await refresh();
  };

  const remove = async (id: string, isDefault: boolean) => {
    if (isDefault) return toast.error("Cannot delete the default branch");
    if (!confirm("Delete this branch? Records assigned to it will become unassigned.")) return;
    const { error } = await supabase.from("branches").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Branch deleted");
    await load(); await refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-brand">Branches</h1>
          <p className="text-sm text-muted-foreground">Manage your company's locations and branch access.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add branch</Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Timezone</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(b => (
              <tr key={b.id} className="border-t border-border hover:bg-accent/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="font-medium">{b.name}</span>
                    {b.is_default && <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-amber-600"><Star className="h-3 w-3" /> Default</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{b.code || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{b.phone || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{b.timezone}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${b.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                    {b.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="sm" onClick={() => setAccessBranch({ id: b.id, name: b.name })}>
                    <Users className="h-4 w-4 mr-1" /> Access
                  </Button>
                  {!b.is_default && (
                    <Button variant="ghost" size="sm" onClick={() => setDefault(b.id)}>Set default</Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => remove(b.id, b.is_default)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No branches yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New branch</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Code</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} /></div>
              <div><Label>Timezone</Label><Input value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))} /></div>
            </div>
            <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BranchAccessDialog
        open={!!accessBranch}
        onOpenChange={(v) => !v && setAccessBranch(null)}
        branch={accessBranch}
        tenantId={tenantId}
      />
    </div>
  );
}
