import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function CustomerInvoices() {
  const { profile } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!profile?.tenant_id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("invoices")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .order("created_at", { ascending: false })
        .limit(100);
      setInvoices(data || []);
      setLoading(false);
    })();
  }, [profile?.tenant_id]);

  const filtered = invoices.filter(inv =>
    inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
    inv.client_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Invoice History</h1>
        <p className="text-sm text-muted-foreground mt-1">View and download your past invoices</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoices..." className="pl-9 h-9" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No invoices found</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
          {filtered.map(inv => (
            <div key={inv.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{inv.invoice_number || "INV"}</p>
                <p className="text-[10px] text-muted-foreground">{inv.client_name} · {new Date(inv.created_at).toLocaleDateString()}</p>
              </div>
              <span className="text-sm font-semibold text-foreground">${Number(inv.total || 0).toFixed(2)}</span>
              <span className={cn(
                "text-[10px] font-medium px-2 py-0.5 rounded-full capitalize",
                inv.status === "paid" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" :
                inv.status === "overdue" ? "bg-destructive/10 text-destructive" :
                "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
              )}>{inv.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
