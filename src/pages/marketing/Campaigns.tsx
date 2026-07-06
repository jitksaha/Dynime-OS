import { useState, useEffect } from "react";
import { Plus, Search, Filter, Mail, MessageSquare, Megaphone } from "lucide-react";
import FormDialog from "@/components/FormDialog";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";
import { useCalendarSync } from "@/hooks/useCalendarSync";

interface Campaign {
  id: string;
  name: string;
  channel: string;
  status: string;
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
  budget: number;
  start_date: string | null;
}

const statusColor: Record<string, string> = {
  Active: "bg-success/10 text-success",
  Draft: "bg-secondary text-muted-foreground",
  Completed: "bg-info/10 text-info",
  Paused: "bg-warning/10 text-warning",
};

const typeIcon: Record<string, React.ElementType> = { Email: Mail, SMS: MessageSquare, WhatsApp: MessageSquare, Social: Megaphone };
const typeColor: Record<string, string> = { Email: "bg-primary/10 text-primary", SMS: "bg-info/10 text-info", WhatsApp: "bg-success/10 text-success", Social: "bg-warning/10 text-warning" };

const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();
const pct = (a: number, b: number) => b === 0 ? "0%" : `${((a / b) * 100).toFixed(1)}%`;

export default function Campaigns() {
  const { tenantId, buildInsert, supabase } = useTenant();
  const { createCampaignLaunch } = useCalendarSync();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchCampaigns = async () => {
    if (!tenantId) return;
    const { data, error } = await supabase.from("campaigns").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    if (!error && data) setCampaigns(data as Campaign[]);
    setLoading(false);
  };

  useEffect(() => { fetchCampaigns(); }, [tenantId]);

  const fields = [
    { name: "name", label: "Campaign Name", placeholder: "e.g. Spring Sale", required: true },
    { name: "type", label: "Channel", type: "select" as const, options: ["Email", "SMS", "WhatsApp", "Social"], required: true },
    { name: "budget", label: "Budget ($)", type: "number" as const, placeholder: "e.g. 5000" },
    { name: "startDate", label: "Start Date", type: "date" as const, required: true },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">Create and manage marketing campaigns</p>
        </div>
        <button onClick={() => setDialogOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity w-full sm:w-auto">
          <Plus className="h-4 w-4" /> New Campaign
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Active", value: campaigns.filter(c => c.status === "Active").length.toString(), color: "text-success" },
          { label: "Total Reach", value: fmt(campaigns.reduce((a, b) => a + b.sent, 0)), color: "text-foreground" },
          { label: "Conversions", value: campaigns.reduce((a, b) => a + b.converted, 0).toString(), color: "text-info" },
          { label: "Total", value: campaigns.length.toString(), color: "text-primary" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <p className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><p className="text-sm">No campaigns yet. Create your first campaign.</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map((c) => {
            const TypeIcon = typeIcon[c.channel] || Mail;
            return (
              <div key={c.id} className="module-card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{c.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${typeColor[c.channel] || ""}`}><TypeIcon className="h-2.5 w-2.5" />{c.channel}</span>
                      <span className="text-xs text-muted-foreground">{c.start_date ? new Date(c.start_date).toLocaleDateString() : "—"}</span>
                    </div>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusColor[c.status] || ""}`}>{c.status}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 pt-3 border-t border-border text-center">
                  <div><p className="text-sm font-semibold text-foreground">{fmt(c.sent)}</p><p className="text-[10px] text-muted-foreground">Sent</p></div>
                  <div><p className="text-sm font-semibold text-foreground">{pct(c.opened, c.sent)}</p><p className="text-[10px] text-muted-foreground">Open</p></div>
                  <div><p className="text-sm font-semibold text-foreground">{pct(c.clicked, c.sent)}</p><p className="text-[10px] text-muted-foreground">CTR</p></div>
                  <div><p className="text-sm font-semibold text-primary">{c.converted}</p><p className="text-[10px] text-muted-foreground">Conv.</p></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Create Campaign"
        fields={fields}
        onSubmit={async (data) => {
          if (!tenantId) return;
          const { error } = await supabase.from("campaigns").insert(buildInsert({
            name: data.name,
            channel: data.type,
            budget: parseInt(data.budget) || 0,
            start_date: data.startDate || null,
          }));
          if (error) { toast.error(error.message); return; }
          toast.success("Campaign created");
          if (data.startDate) {
            await createCampaignLaunch(data.name, new Date(data.startDate).toISOString(), "new");
          }
          setDialogOpen(false);
          fetchCampaigns();
        }}
      />
    </div>
  );
}
