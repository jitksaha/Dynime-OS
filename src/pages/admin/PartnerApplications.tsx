// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Eye, CheckCircle, XCircle, Clock } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export default function PartnerApplications() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<any>(null);
  const [notes, setNotes] = useState("");

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ["partner-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("partner_applications")
        .update({ status, admin_notes: notes, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      toast.success(`Application ${status}`);
      qc.invalidateQueries({ queryKey: ["partner-applications"] });
      setSelected(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const stats = {
    total: apps.length,
    pending: apps.filter((a: any) => a.status === "pending").length,
    approved: apps.filter((a: any) => a.status === "approved").length,
    rejected: apps.filter((a: any) => a.status === "rejected").length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, icon: Eye },
          { label: "Pending", value: stats.pending, icon: Clock },
          { label: "Approved", value: stats.approved, icon: CheckCircle },
          { label: "Rejected", value: stats.rejected, icon: XCircle },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : apps.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No applications yet</TableCell></TableRow>
                ) : (
                  apps.map((app: any) => (
                    <TableRow key={app.id}>
                      <TableCell>
                        <p className="font-medium text-foreground">{app.company_name}</p>
                        {app.website && <p className="text-xs text-muted-foreground">{app.website}</p>}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{app.contact_name}</p>
                        <p className="text-xs text-muted-foreground">{app.contact_email}</p>
                      </TableCell>
                      <TableCell><Badge variant="secondary">{app.category}</Badge></TableCell>
                      <TableCell>
                        <Badge className={`border-0 ${statusColors[app.status] || statusColors.pending}`}>{app.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(app.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => { setSelected(app); setNotes(app.admin_notes || ""); }}>
                          <Eye className="h-4 w-4 mr-1" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Application</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Company:</span> <p className="font-medium">{selected.company_name}</p></div>
                <div><span className="text-muted-foreground">Contact:</span> <p className="font-medium">{selected.contact_name}</p></div>
                <div><span className="text-muted-foreground">Email:</span> <p>{selected.contact_email}</p></div>
                <div><span className="text-muted-foreground">Phone:</span> <p>{selected.contact_phone || "—"}</p></div>
                <div><span className="text-muted-foreground">Country:</span> <p>{selected.country || "—"}</p></div>
                <div><span className="text-muted-foreground">Category:</span> <p>{selected.category}</p></div>
              </div>
              {selected.description && (
                <div><Label className="text-muted-foreground">About Company</Label><p className="text-sm mt-1">{selected.description}</p></div>
              )}
              {selected.why_partner && (
                <div><Label className="text-muted-foreground">Why Partner</Label><p className="text-sm mt-1">{selected.why_partner}</p></div>
              )}
              <div className="space-y-1.5">
                <Label>Admin Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
            {selected?.status === "pending" && (
              <>
                <Button variant="destructive" onClick={() => updateStatus.mutate({ id: selected.id, status: "rejected" })} disabled={updateStatus.isPending}>
                  Reject
                </Button>
                <Button onClick={() => updateStatus.mutate({ id: selected.id, status: "approved" })} disabled={updateStatus.isPending}>
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
