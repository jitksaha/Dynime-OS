// @ts-nocheck
import { useState, useEffect } from "react";
import { FileText, Plus, Search, Pencil, Trash2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import FormDialog from "@/components/FormDialog";
import { differenceInDays } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  Active: "bg-success/10 text-success",
  "Under Review": "bg-warning/10 text-warning",
  Expired: "bg-destructive/10 text-destructive",
  Terminated: "bg-destructive/10 text-destructive",
};

export default function Contracts() {
  const { profile, user } = useAuth();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const tid = profile?.tenant_id;
  const uid = user?.id;

  const fetchData = async () => {
    if (!tid) return;
    const { data } = await supabase.from("contracts").select("*").eq("tenant_id", tid).order("created_at", { ascending: false });
    if (data) setContracts(data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [tid]);

  const handleSave = async (v: Record<string, string>) => {
    if (!tid || !uid) return;
    const payload = { tenant_id: tid, title: v.title, contract_type: v.contract_type || "Service Agreement", party_name: v.party_name, party_email: v.party_email || null, status: v.status || "Draft", start_date: v.start_date || null, end_date: v.end_date || null, value: Number(v.value) || 0, auto_renew: v.auto_renew === "Yes", terms: v.terms || null, created_by: uid };
    if (editItem) {
      await supabase.from("contracts").update(payload).eq("id", editItem.id);
      toast.success("Contract updated");
    } else {
      await supabase.from("contracts").insert(payload);
      toast.success("Contract created");
    }
    setEditItem(null); setDialogOpen(false); fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("contracts").delete().eq("id", id);
    toast.success("Deleted"); fetchData();
  };

  const filtered = contracts.filter(c => c.title.toLowerCase().includes(search.toLowerCase()) || c.party_name.toLowerCase().includes(search.toLowerCase()));
  const expiringSoon = contracts.filter(c => c.end_date && differenceInDays(new Date(c.end_date), new Date()) <= 30 && differenceInDays(new Date(c.end_date), new Date()) >= 0);

  if (loading) return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /> Contracts & Legal</h1>
          <p className="text-sm text-muted-foreground">{contracts.length} contracts</p>
        </div>
        <Button onClick={() => { setEditItem(null); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" /> New Contract</Button>
      </div>

      {expiringSoon.length > 0 && (
        <div className="p-3 rounded-xl bg-warning/10 border border-warning/20 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-warning" />
          <span className="text-sm text-warning font-medium">{expiringSoon.length} contracts expiring within 30 days</span>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search contracts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="space-y-3">
        {filtered.map(c => {
          const daysLeft = c.end_date ? differenceInDays(new Date(c.end_date), new Date()) : null;
          return (
            <div key={c.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
              <div className="space-y-1">
                <p className="font-semibold text-foreground">{c.title}</p>
                <p className="text-xs text-muted-foreground">With: {c.party_name} · Type: {c.contract_type}</p>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  {c.start_date && <span>Start: {c.start_date}</span>}
                  {c.end_date && <span>End: {c.end_date}</span>}
                  {daysLeft !== null && daysLeft >= 0 && daysLeft <= 30 && <span className="text-warning font-medium">({daysLeft}d left)</span>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {c.value > 0 && <span className="text-sm font-semibold text-foreground">${Number(c.value).toLocaleString()}</span>}
                {c.auto_renew && <Badge variant="outline" className="text-xs">Auto-renew</Badge>}
                <Badge className={STATUS_COLORS[c.status] || ""}>{c.status}</Badge>
                <Button variant="ghost" size="icon" onClick={() => { setEditItem(c); setDialogOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-center py-12 text-muted-foreground">No contracts found</p>}
      </div>

      <FormDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditItem(null); }} title={editItem ? "Edit Contract" : "New Contract"}
        defaultValues={editItem ? { title: editItem.title, party_name: editItem.party_name, party_email: editItem.party_email || "", contract_type: editItem.contract_type, status: editItem.status, start_date: editItem.start_date || "", end_date: editItem.end_date || "", value: String(editItem.value || 0), auto_renew: editItem.auto_renew ? "Yes" : "No", terms: editItem.terms || "" } : undefined}
        fields={[
          { name: "title", label: "Title", required: true },
          { name: "party_name", label: "Counterparty", required: true },
          { name: "party_email", label: "Email", type: "email" },
          { name: "contract_type", label: "Type", type: "select", options: ["Service Agreement", "NDA", "Employment", "Vendor", "Lease", "License", "SLA", "Other"] },
          { name: "status", label: "Status", type: "select", options: ["Draft", "Active", "Under Review", "Expired", "Terminated"] },
          { name: "start_date", label: "Start Date", type: "date" },
          { name: "end_date", label: "End Date", type: "date" },
          { name: "value", label: "Contract Value", type: "number" },
          { name: "auto_renew", label: "Auto Renew", type: "select", options: ["Yes", "No"] },
          { name: "terms", label: "Terms & Notes", type: "textarea" },
        ]}
        onSubmit={handleSave}
      />
    </div>
  );
}
