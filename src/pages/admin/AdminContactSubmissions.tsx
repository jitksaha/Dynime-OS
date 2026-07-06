import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Mail, Search, Trash2, Eye, Clock, CheckCircle, XCircle, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminContactSubmissions() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<ContactSubmission | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchSubmissions = async () => {
    let query = supabase
      .from("contact_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data } = await query;
    setSubmissions((data as ContactSubmission[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSubmissions();
  }, [statusFilter]);

  const filtered = submissions.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.subject.toLowerCase().includes(search.toLowerCase())
  );

  const updateStatus = async (id: string, status: string) => {
    setUpdatingStatus(true);
    const { error } = await supabase
      .from("contact_submissions")
      .update({ status, admin_notes: adminNotes || null })
      .eq("id", id);
    setUpdatingStatus(false);
    if (error) return toast.error(error.message);
    toast.success(`Status updated to ${status}`);
    if (selected?.id === id) {
      setSelected({ ...selected, status, admin_notes: adminNotes || null });
    }
    fetchSubmissions();
  };

  const deleteSubmission = async (id: string) => {
    const { error } = await supabase.from("contact_submissions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Submission deleted");
    setSelected(null);
    fetchSubmissions();
  };

  const openDetail = (sub: ContactSubmission) => {
    setSelected(sub);
    setAdminNotes(sub.admin_notes || "");
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "new": return <Clock className="h-3.5 w-3.5" />;
      case "in_progress": return <MessageSquare className="h-3.5 w-3.5" />;
      case "resolved": return <CheckCircle className="h-3.5 w-3.5" />;
      case "closed": return <XCircle className="h-3.5 w-3.5" />;
      default: return <Clock className="h-3.5 w-3.5" />;
    }
  };

  const statusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "new": return "default";
      case "in_progress": return "secondary";
      case "resolved": return "outline";
      case "closed": return "destructive";
      default: return "default";
    }
  };

  const stats = {
    total: submissions.length,
    new: submissions.filter((s) => s.status === "new").length,
    in_progress: submissions.filter((s) => s.status === "in_progress").length,
    resolved: submissions.filter((s) => s.status === "resolved").length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contact Submissions</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage messages from the contact form</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold text-primary">{stats.new}</p>
          <p className="text-xs text-muted-foreground">New</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold text-warning">{stats.in_progress}</p>
          <p className="text-xs text-muted-foreground">In Progress</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold text-success">{stats.resolved}</p>
          <p className="text-xs text-muted-foreground">Resolved</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, or subject..." className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Mail className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No contact submissions yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((sub) => (
            <div
              key={sub.id}
              onClick={() => openDetail(sub)}
              className="flex items-center justify-between p-4 border border-border rounded-xl bg-card hover:border-primary/30 transition-colors cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-foreground truncate">{sub.subject}</p>
                  <Badge variant={statusVariant(sub.status)} className="shrink-0 text-[10px]">
                    {statusIcon(sub.status)}
                    <span className="ml-1">{sub.status.replace("_", " ")}</span>
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {sub.name} &middot; {sub.email} &middot; {format(new Date(sub.created_at), "MMM d, yyyy h:mm a")}
                </p>
              </div>
              <div className="flex items-center gap-1 ml-3">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openDetail(sub); }}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); deleteSubmission(sub.id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Contact Submission</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="text-sm font-medium text-foreground">{selected.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <a href={`mailto:${selected.email}`} className="text-sm font-medium text-primary hover:underline">{selected.email}</a>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="text-sm text-foreground">{format(new Date(selected.created_at), "MMM d, yyyy h:mm a")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={statusVariant(selected.status)} className="text-xs mt-0.5">
                    {selected.status.replace("_", " ")}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Subject</p>
                <p className="text-sm font-medium text-foreground">{selected.subject}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Message</p>
                <div className="bg-muted/50 rounded-lg p-3 text-sm text-foreground whitespace-pre-wrap">{selected.message}</div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Admin Notes</p>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes..."
                  rows={3}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Select value={selected.status} onValueChange={(v) => updateStatus(selected.id, v)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => updateStatus(selected.id, selected.status)} disabled={updatingStatus}>
                  Save Notes
                </Button>
                <Button variant="outline" onClick={() => window.open(`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject)}`, "_blank")}>
                  <Mail className="h-4 w-4 mr-1" /> Reply
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
