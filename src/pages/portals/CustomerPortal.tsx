import { useState, useEffect } from "react";
import {
  FileText, Headphones, Plus, Loader2, Send, Download, Wallet,
  TrendingUp, Clock, AlertCircle, ArrowRight, Star, BookOpen, Truck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTenant } from "@/hooks/useTenant";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { downloadReceipt } from "@/lib/receipt-generator";
import { toast } from "sonner";

export default function CustomerPortal() {
  const { profile, user } = useAuth();
  const { tenantId, supabase } = useTenant();
  const { symbol: cs } = useTenantCurrency();
  const { t } = useLanguage();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"invoices" | "tickets">("invoices");
  const [showTicketForm, setShowTicketForm] = useState(false);

  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketPriority, setTicketPriority] = useState("Medium");

  const fetchData = async () => {
    if (!tenantId) return;
    const [invRes, ticketRes] = await Promise.all([
      supabase.from("invoices").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(20),
      supabase.from("tickets").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(20),
    ]);
    if (invRes.data) setInvoices(invRes.data);
    if (ticketRes.data) setTickets(ticketRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [tenantId]);

  const handleCreateTicket = async () => {
    if (!tenantId || !user || !ticketSubject.trim()) return;
    const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await supabase.from("tickets").insert({
      tenant_id: tenantId, created_by: user.id, ticket_number: ticketNumber,
      subject: ticketSubject, description: ticketDescription || null,
      priority: ticketPriority, customer: profile?.full_name || "Customer", status: "Open",
    });
    if (error) { toast.error("Failed to create ticket"); return; }
    toast.success("Support ticket created!");
    setShowTicketForm(false);
    setTicketSubject(""); setTicketDescription(""); setTicketPriority("Medium");
    fetchData();
  };

  const statusColors: Record<string, string> = {
    Paid: "text-success bg-success/10", Pending: "text-warning bg-warning/10",
    Overdue: "text-destructive bg-destructive/10", Draft: "text-muted-foreground bg-muted/10",
    Open: "text-info bg-info/10", Closed: "text-success bg-success/10",
    "In Progress": "text-warning bg-warning/10",
  };

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  const totalInvoiced = invoices.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const paidInvoices = invoices.filter(i => i.status === "Paid").length;
  const pendingInvoices = invoices.filter(i => i.status === "Pending" || i.status === "Overdue").length;
  const openTickets = tickets.filter(t => t.status === "Open" || t.status === "In Progress").length;

  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
  const fadeUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{greeting}!</p>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{profile?.full_name || "Customer"}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">View invoices, submit tickets, and manage your account</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/portal/customer/wallet" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
            <Wallet className="h-4 w-4" /> My Wallet
          </Link>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: FileText, label: "Total Invoiced", value: `${cs}${totalInvoiced.toLocaleString()}`, color: "text-primary", bg: "bg-primary/10" },
          { icon: TrendingUp, label: "Paid Invoices", value: `${paidInvoices}`, color: "text-success", bg: "bg-success/10" },
          { icon: Clock, label: "Pending / Overdue", value: `${pendingInvoices}`, color: "text-warning", bg: "bg-warning/10" },
          { icon: AlertCircle, label: "Open Tickets", value: `${openTickets}`, color: "text-info", bg: "bg-info/10" },
        ].map((stat) => (
          <div key={stat.label} className="p-4 rounded-2xl border border-border bg-card hover:shadow-md hover:border-primary/15 transition-all">
            <div className={`p-2 rounded-xl ${stat.bg} w-fit mb-3`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <p className="text-lg font-bold text-foreground tracking-tight">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        {/* Left — Main Content */}
        <div className="space-y-5 min-w-0">
          {/* Tabs + Action */}
          <motion.div variants={fadeUp} className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1 bg-secondary/40 rounded-xl p-1">
              {([
                { key: "invoices" as const, label: t("invoices"), icon: FileText, count: invoices.length },
                { key: "tickets" as const, label: "Tickets", icon: Headphones, count: tickets.length },
              ]).map((tab) => (
                <button
                  key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? "bg-info/10 text-info" : "bg-secondary text-muted-foreground"}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
            {activeTab === "tickets" && (
              <button onClick={() => setShowTicketForm(!showTicketForm)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                <Plus className="h-3.5 w-3.5" /> New Ticket
              </button>
            )}
          </motion.div>

          {/* Ticket Form */}
          {showTicketForm && (
            <motion.div variants={fadeUp} className="p-5 rounded-2xl border-2 border-info/20 bg-card space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Submit Support Ticket</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Subject</label>
                  <input value={ticketSubject} onChange={e => setTicketSubject(e.target.value)} placeholder="Describe your issue briefly" className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-info/30 focus:border-info/50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Priority</label>
                  <select value={ticketPriority} onChange={e => setTicketPriority(e.target.value)} className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-info/30 focus:border-info/50 transition-all">
                    <option>Low</option><option>Medium</option><option>High</option><option>Urgent</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description (optional)</label>
                  <textarea value={ticketDescription} onChange={e => setTicketDescription(e.target.value)} placeholder="Provide more details..." rows={3} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-info/30 focus:border-info/50 resize-none transition-all" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleCreateTicket} disabled={!ticketSubject.trim()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40">
                  <Send className="h-3.5 w-3.5" /> Submit Ticket
                </button>
                <button onClick={() => setShowTicketForm(false)} className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">Cancel</button>
              </div>
            </motion.div>
          )}

          {/* Data Tables */}
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : activeTab === "invoices" ? (
            <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="hidden sm:grid grid-cols-[1fr_100px_100px_100px_80px] gap-2 px-5 py-3 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Invoice #</span><span>{t("amount")}</span><span>{t("date")}</span><span>{t("status")}</span><span></span>
              </div>
              {invoices.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No invoices found</p>
                </div>
              ) : invoices.map((inv) => (
                <div key={inv.id}>
                  <div className="hidden sm:grid grid-cols-[1fr_100px_100px_100px_80px] gap-2 px-5 py-3 border-b border-border last:border-b-0 items-center text-sm hover:bg-secondary/30 transition-colors">
                    <span className="font-medium text-foreground">{inv.invoice_number}</span>
                    <span className="text-foreground font-medium">{cs}{Number(inv.amount).toLocaleString()}</span>
                    <span className="text-muted-foreground">{new Date(inv.issue_date).toLocaleDateString()}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${statusColors[inv.status] || "text-muted-foreground bg-muted/10"}`}>{inv.status}</span>
                    <button onClick={() => downloadReceipt(inv)} className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors" title="Download receipt">
                      <Download className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="sm:hidden px-4 py-3 border-b border-border last:border-b-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-foreground">{inv.invoice_number}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[inv.status] || "text-muted-foreground bg-muted/10"}`}>{inv.status}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{cs}{Number(inv.amount).toLocaleString()} · {new Date(inv.issue_date).toLocaleDateString()}</span>
                      <button onClick={() => downloadReceipt(inv)} className="p-1 rounded hover:bg-primary/10">
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="hidden sm:grid grid-cols-[1fr_100px_100px_100px] gap-2 px-5 py-3 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Subject</span><span>Priority</span><span>{t("date")}</span><span>{t("status")}</span>
              </div>
              {tickets.length === 0 ? (
                <div className="py-12 text-center">
                  <Headphones className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No tickets found</p>
                  <p className="text-xs text-muted-foreground mt-1">Click "New Ticket" to create one</p>
                </div>
              ) : tickets.map((ticket) => (
                <div key={ticket.id}>
                  <div className="hidden sm:grid grid-cols-[1fr_100px_100px_100px] gap-2 px-5 py-3 border-b border-border last:border-b-0 items-center text-sm hover:bg-secondary/30 transition-colors">
                    <div>
                      <span className="font-medium text-foreground truncate block">{ticket.subject}</span>
                      {ticket.description && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[300px]">{ticket.description}</p>}
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${ticket.priority === "High" || ticket.priority === "Urgent" ? "text-destructive bg-destructive/10" : ticket.priority === "Medium" ? "text-warning bg-warning/10" : "text-info bg-info/10"}`}>{ticket.priority}</span>
                    <span className="text-muted-foreground">{new Date(ticket.created_at).toLocaleDateString()}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${statusColors[ticket.status] || "text-muted-foreground bg-muted/10"}`}>{ticket.status}</span>
                  </div>
                  <div className="sm:hidden px-4 py-3 border-b border-border last:border-b-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-foreground truncate max-w-[200px]">{ticket.subject}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[ticket.status] || "text-muted-foreground bg-muted/10"}`}>{ticket.status}</span>
                    </div>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span className={`font-medium px-1.5 py-0.5 rounded-full ${ticket.priority === "High" || ticket.priority === "Urgent" ? "text-destructive bg-destructive/10" : "text-muted-foreground"}`}>{ticket.priority}</span>
                      <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-5">
          {/* Quick Links */}
          <motion.div variants={fadeUp} className="p-5 rounded-2xl border border-border bg-card">
            <h2 className="text-sm font-semibold text-foreground mb-3">Quick Access</h2>
            <div className="space-y-1.5">
              {[
                { label: "My Wallet", icon: Wallet, path: "/portal/customer/wallet", desc: "Balance & transactions" },
                { label: "Order Tracking", icon: Truck, path: "/portal/customer/orders", desc: "Track your orders" },
                { label: "Knowledge Base", icon: BookOpen, path: "/portal/customer/knowledge-base", desc: "Help articles & guides" },
                { label: "Loyalty & Rewards", icon: Star, path: "/portal/customer/loyalty", desc: "Points & tiers" },
              ].map((item) => (
                <Link
                  key={item.path} to={item.path}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-all group"
                >
                  <div className="h-8 w-8 rounded-xl bg-info/10 flex items-center justify-center shrink-0 group-hover:bg-info/15 transition-colors">
                    <item.icon className="h-3.5 w-3.5 text-info" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-info transition-colors">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-info transition-colors" />
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Account Summary */}
          <motion.div variants={fadeUp} className="p-5 rounded-2xl border border-border bg-card">
            <h2 className="text-sm font-semibold text-foreground mb-3">Account Summary</h2>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Payment Rate</span>
                  <span className="font-semibold text-foreground">{invoices.length > 0 ? Math.round((paidInvoices / invoices.length) * 100) : 0}%</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-success transition-all" style={{ width: `${invoices.length > 0 ? (paidInvoices / invoices.length) * 100 : 0}%` }} />
                </div>
              </div>
              <div className="pt-2 border-t border-border grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground">Total Paid</p>
                  <p className="text-lg font-bold text-foreground">
                    {cs}{invoices.filter(i => i.status === "Paid").reduce((s, i) => s + (Number(i.amount) || 0), 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Outstanding</p>
                  <p className="text-lg font-bold text-warning">
                    {cs}{invoices.filter(i => i.status !== "Paid" && i.status !== "Draft").reduce((s, i) => s + (Number(i.amount) || 0), 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
