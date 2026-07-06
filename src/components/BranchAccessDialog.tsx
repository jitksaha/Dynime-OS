// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/db";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branch: { id: string; name: string } | null;
  tenantId: string | null;
}

type Row = {
  user_id: string;
  full_name: string | null;
  job_title: string | null;
  assigned: boolean;
  access_level: "branch" | "manager";
  hasGlobal: boolean;
  originalAssigned: boolean;
  originalLevel: "branch" | "manager";
};

export default function BranchAccessDialog({ open, onOpenChange, branch, tenantId }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !branch || !tenantId) return;
    (async () => {
      setLoading(true);
      const [{ data: profiles }, { data: assignments }] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, full_name, job_title")
          .eq("tenant_id", tenantId)
          .order("full_name"),
        supabase
          .from("user_branches")
          .select("user_id, branch_id, access_level")
          .eq("tenant_id", tenantId),
      ]);
      const byUser = new Map<string, any[]>();
      (assignments || []).forEach((a: any) => {
        const list = byUser.get(a.user_id) || [];
        list.push(a);
        byUser.set(a.user_id, list);
      });
      const list: Row[] = (profiles || []).map((p: any) => {
        const userAssigns = byUser.get(p.user_id) || [];
        const branchAssign = userAssigns.find((a) => a.branch_id === branch.id);
        const hasGlobal = userAssigns.some(
          (a) => a.access_level === "global" || a.branch_id === null
        );
        const level = (branchAssign?.access_level as any) === "manager" ? "manager" : "branch";
        return {
          user_id: p.user_id,
          full_name: p.full_name,
          job_title: p.job_title,
          assigned: !!branchAssign,
          access_level: level,
          hasGlobal,
          originalAssigned: !!branchAssign,
          originalLevel: level,
        };
      });
      setRows(list);
      setLoading(false);
    })();
  }, [open, branch?.id, tenantId]);

  const toggle = (uid: string, val: boolean) =>
    setRows((p) => p.map((r) => (r.user_id === uid ? { ...r, assigned: val } : r)));
  const setLevel = (uid: string, lvl: "branch" | "manager") =>
    setRows((p) => p.map((r) => (r.user_id === uid ? { ...r, access_level: lvl } : r)));

  const save = async () => {
    if (!branch || !tenantId) return;
    setSaving(true);
    const toAdd = rows.filter((r) => r.assigned && !r.originalAssigned);
    const toRemove = rows.filter((r) => !r.assigned && r.originalAssigned);
    const toUpdate = rows.filter(
      (r) => r.assigned && r.originalAssigned && r.access_level !== r.originalLevel
    );

    try {
      if (toAdd.length) {
        const { error } = await supabase.from("user_branches").insert(
          toAdd.map((r) => ({
            user_id: r.user_id,
            tenant_id: tenantId,
            branch_id: branch.id,
            access_level: r.access_level,
          }))
        );
        if (error) throw error;
      }
      for (const r of toUpdate) {
        const { error } = await supabase
          .from("user_branches")
          .update({ access_level: r.access_level })
          .eq("user_id", r.user_id)
          .eq("tenant_id", tenantId)
          .eq("branch_id", branch.id);
        if (error) throw error;
      }
      for (const r of toRemove) {
        const { error } = await supabase
          .from("user_branches")
          .delete()
          .eq("user_id", r.user_id)
          .eq("tenant_id", tenantId)
          .eq("branch_id", branch.id);
        if (error) throw error;
      }
      toast.success("Branch access updated");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Manage access — {branch?.name}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-1">
            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No users in this tenant yet.
              </p>
            )}
            {rows.map((r) => (
              <div
                key={r.user_id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40"
              >
                <Checkbox
                  checked={r.assigned || r.hasGlobal}
                  disabled={r.hasGlobal}
                  onCheckedChange={(v) => toggle(r.user_id, !!v)}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {r.full_name || "Unnamed user"}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {r.hasGlobal ? "Global access (all branches)" : r.job_title || "—"}
                  </div>
                </div>
                <Select
                  value={r.access_level}
                  onValueChange={(v) => setLevel(r.user_id, v as any)}
                  disabled={!r.assigned || r.hasGlobal}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="branch">Member</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || loading}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
