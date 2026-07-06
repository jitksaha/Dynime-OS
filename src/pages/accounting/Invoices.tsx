import { useState, useEffect, useCallback } from "react";
import {
  Plus, Download, Eye, Send, Printer, Trash2, X, Mail,
  MessageSquare, Link2, Copy, Check, Search,
  FileText, Clock, AlertTriangle, CheckCircle,
} from "lucide-react";
import { exportToCSV, printInvoice } from "@/lib/export-utils";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { useCalendarSync } from "@/hooks/useCalendarSync";

interface TaxProfile {
  id: string;
  name: string;
  region: string;
  tax_rates: { name: string; rate: number; tax_type: string; is_compound: boolean }[];
}

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  tax_profile_id: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  client: string;
  client_email: string | null;
  client_phone: string | null;
  client_address: string | null;
  amount: number;
  subtotal: number;
  tax_amount: number;
  tax_profile_id: string | null;
  issue_date: string;
  due_date: string | null;
  status: string;
  items_count: number;
  currency: string;
  notes: string | null;
  share_token: string | null;
  sent_via: string | null;
  sent_at: string | null;
  payment_terms: string | null;
  discount_type: string | null;
  discount_value: number;
  discount_amount: number;
}

const STATUS_MAP: Record<string, { color: string; icon: typeof CheckCircle; label: string }> = {
  Paid: { color: "bg-green-500/10 text-green-600", icon: CheckCircle, label: "Paid" },
  Pending: { color: "bg-amber-500/10 text-amber-600", icon: Clock, label: "Pending" },
  Overdue: { color: "bg-destructive/10 text-destructive", icon: AlertTriangle, label: "Overdue" },
  Draft: { color: "bg-muted text-muted-foreground", icon: FileText, label: "Draft" },
};

const PAYMENT_TERMS = [
  { value: "due_on_receipt", label: "Due on Receipt" },
  { value: "net_7", label: "Net 7" },
  { value: "net_15", label: "Net 15" },
  { value: "net_30", label: "Net 30" },
  { value: "net_45", label: "Net 45" },
  { value: "net_60", label: "Net 60" },
  { value: "net_90", label: "Net 90" },
  { value: "custom", label: "Custom" },
];

const CURRENCIES = ["USD", "EUR", "GBP", "BDT", "INR", "AED", "SAR", "CAD", "AUD", "JPY", "SGD", "MYR", "CNY", "KRW"];

const fmtWithCurrency = (n: number, cur = "USD") => {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: cur, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${cur} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
};

function calcTax(subtotal: number, profile: TaxProfile | undefined): number {
  if (!profile || !profile.tax_rates?.length) return 0;
  let tax = 0;
  for (const rate of profile.tax_rates) {
    if (rate.tax_type === "percentage") {
      const base = rate.is_compound ? subtotal + tax : subtotal;
      tax += base * (rate.rate / 100);
    } else {
      tax += rate.rate;
    }
  }
  return Math.round(tax * 100) / 100;
}

function generateToken() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 24);
}

export default function Invoices() {
  const { tenantId, userId, buildInsert, applyBranchFilter, activeBranchId, supabase } = useTenant();
  const { currency: tenantCurrency } = useTenantCurrency();
  const { createInvoiceDueReminder } = useCalendarSync();
  const fmt = (n: number, cur?: string) => fmtWithCurrency(n, cur || tenantCurrency);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [taxProfiles, setTaxProfiles] = useState<TaxProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [sendDialogInvoice, setSendDialogInvoice] = useState<Invoice | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sending, setSending] = useState(false);
  const [linkCopied, setLinkCopied] = useState<string | null>(null);

  // Form state
  const [client, setClient] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [selectedTaxProfile, setSelectedTaxProfile] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("net_30");
  const [discountType, setDiscountType] = useState("");
  const [discountValue, setDiscountValue] = useState(0);
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, unit_price: 0, tax_profile_id: "" }]);
  const [formSaving, setFormSaving] = useState(false);

  

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    const invQuery = supabase.from("invoices").select("*").eq("tenant_id", tenantId);
    const [invRes, tpRes] = await Promise.all([
      applyBranchFilter(invQuery).order("created_at", { ascending: false }),
      supabase.from("tax_profiles").select("id, name, region").eq("tenant_id", tenantId),
    ]);
    if (invRes.data) setInvoices(invRes.data as any[]);
    if (tpRes.data) {
      const { data: rates } = await supabase.from("tax_rates").select("*").eq("tenant_id", tenantId);
      const enriched = tpRes.data.map((p: any) => ({
        ...p,
        tax_rates: (rates || []).filter((r: any) => r.tax_profile_id === p.id),
      }));
      setTaxProfiles(enriched);
    }
    setLoading(false);
  }, [tenantId, supabase, applyBranchFilter, activeBranchId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addItem = () => setItems([...items, { description: "", quantity: 1, unit_price: 0, tax_profile_id: selectedTaxProfile }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof LineItem, value: any) => {
    const updated = [...items];
    (updated[i] as any)[field] = value;
    setItems(updated);
  };

  const currentProfile = taxProfiles.find((p) => p.id === selectedTaxProfile);
  const subtotal = items.reduce((s, item) => s + item.quantity * item.unit_price, 0);
  const discountAmt = discountType === "percentage" ? subtotal * (discountValue / 100) : discountType === "flat" ? discountValue : 0;
  const afterDiscount = subtotal - discountAmt;
  const taxAmount = calcTax(afterDiscount, currentProfile);
  const total = afterDiscount + taxAmount;

  const resetForm = () => {
    setClient(""); setClientEmail(""); setClientPhone(""); setClientAddress("");
    setDueDate(""); setCurrency("USD"); setSelectedTaxProfile(""); setNotes("");
    setPaymentTerms("net_30"); setDiscountType(""); setDiscountValue(0);
    setItems([{ description: "", quantity: 1, unit_price: 0, tax_profile_id: "" }]);
    setDialogOpen(false);
  };

  const handleSubmit = async (asDraft = false) => {
    if (!tenantId || !client) { toast.error("Client name is required"); return; }
    setFormSaving(true);
    const count = invoices.length;
    const invoiceNumber = `INV-${String(1000 + count + 1).padStart(4, "0")}`;

    const { data: invData, error } = await supabase.from("invoices").insert(buildInsert({
      invoice_number: invoiceNumber,
      client,
      client_email: clientEmail || null,
      client_phone: clientPhone || null,
      client_address: clientAddress || null,
      amount: total,
      subtotal: afterDiscount,
      tax_amount: taxAmount,
      tax_profile_id: selectedTaxProfile || null,
      due_date: dueDate || null,
      items_count: items.filter((i) => i.description).length,
      currency,
      notes: notes || null,
      status: asDraft ? "Draft" : "Pending",
      share_token: generateToken(),
      payment_terms: paymentTerms,
      discount_type: discountType || null,
      discount_value: discountValue,
      discount_amount: discountAmt,
    }) as any).select("id").single();

    if (error) { toast.error(error.message); setFormSaving(false); return; }

    if (invData) {
      const itemsToInsert = items.filter((item) => item.description).map((item) => ({
        invoice_id: invData.id,
        tenant_id: tenantId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.quantity * item.unit_price,
        tax_profile_id: selectedTaxProfile || null,
        tax_amount: calcTax(item.quantity * item.unit_price, currentProfile),
        total: item.quantity * item.unit_price + calcTax(item.quantity * item.unit_price, currentProfile),
      }));
      if (itemsToInsert.length > 0) {
        await supabase.from("invoice_items").insert(itemsToInsert);
      }
    }

    toast.success(asDraft ? "Draft saved" : "Invoice created");
    // Create calendar reminder for due date
    if (!asDraft && dueDate && invData) {
      await createInvoiceDueReminder(invoiceNumber, new Date(dueDate).toISOString(), total, invData.id);
    }
    resetForm();
    setFormSaving(false);
    fetchData();
  };

  const deleteInvoice = async (id: string) => {
    await supabase.from("invoice_items").delete().eq("invoice_id", id);
    await supabase.from("invoices").delete().eq("id", id);
    toast.success("Invoice deleted");
    fetchData();
  };

  const markAsPaid = async (id: string) => {
    await supabase.from("invoices").update({ status: "Paid" } as any).eq("id", id);
    toast.success("Marked as paid");
    fetchData();
  };

  // ---- SEND FUNCTIONS ----
  const getShareLink = (inv: Invoice) => {
    const token = inv.share_token;
    return `${window.location.origin}/invoice/${token}`;
  };

  const copyLink = async (inv: Invoice) => {
    if (!inv.share_token) {
      const token = generateToken();
      await supabase.from("invoices").update({ share_token: token } as any).eq("id", inv.id);
      inv.share_token = token;
    }
    await navigator.clipboard.writeText(getShareLink(inv));
    setLinkCopied(inv.id);
    toast.success("Invoice link copied!");
    setTimeout(() => setLinkCopied(null), 2000);
    await supabase.from("invoices").update({ sent_via: "link", sent_at: new Date().toISOString() } as any).eq("id", inv.id);
  };

  const sendEmail = async (inv: Invoice) => {
    if (!inv.client_email) { toast.error("No email address on this invoice"); return; }
    setSending(true);
    try {
      const invoiceHtml = buildInvoiceEmailHtml(inv);
      const { error } = await supabase.functions.invoke("send-custom-email", {
        body: {
          to: inv.client_email,
          subject: `Invoice ${inv.invoice_number} from your provider`,
          html: invoiceHtml,
          email_type: "notification",
        },
      });
      if (error) throw error;
      await supabase.from("invoices").update({ sent_via: "email", sent_at: new Date().toISOString() } as any).eq("id", inv.id);
      toast.success(`Invoice sent to ${inv.client_email}`);
      setSendDialogInvoice(null);
      fetchData();
    } catch (e: any) {
      toast.error("Failed to send email: " + (e.message || "Unknown error"));
    }
    setSending(false);
  };

  const sendSms = async (inv: Invoice) => {
    if (!inv.client_phone) { toast.error("No phone number on this invoice"); return; }
    setSending(true);
    try {
      const link = getShareLink(inv);
      const message = `Invoice ${inv.invoice_number} — Amount: ${fmt(inv.amount, inv.currency)}. View & pay: ${link}`;

      // Get the tenant's profile to retrieve tenant_id for SMS gateway
      const { error } = await supabase.functions.invoke("sms-send", {
        body: {
          phone: inv.client_phone,
          message,
          tenant_id: tenantId,
          event_key: "invoice_sent",
          sent_by: userId,
        },
      });
      if (error) throw error;
      await supabase.from("invoices").update({ sent_via: "sms", sent_at: new Date().toISOString() } as any).eq("id", inv.id);
      toast.success(`Invoice SMS sent to ${inv.client_phone}`);
      setSendDialogInvoice(null);
      fetchData();
    } catch (e: any) {
      toast.error("Failed to send SMS: " + (e.message || "Unknown error"));
    }
    setSending(false);
  };

  function buildInvoiceEmailHtml(inv: Invoice) {
    return `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
          <div style="background:#111827;color:white;padding:24px">
            <h1 style="margin:0;font-size:20px">Invoice ${inv.invoice_number}</h1>
            <p style="margin:4px 0 0;color:#9ca3af;font-size:14px">Issued ${new Date(inv.issue_date).toLocaleDateString()}</p>
          </div>
          <div style="padding:24px">
            <table style="width:100%;font-size:14px;margin-bottom:16px">
              <tr><td style="color:#6b7280;padding:4px 0">Bill To:</td><td style="text-align:right;font-weight:600">${inv.client}</td></tr>
              ${inv.due_date ? `<tr><td style="color:#6b7280;padding:4px 0">Due Date:</td><td style="text-align:right">${new Date(inv.due_date).toLocaleDateString()}</td></tr>` : ""}
              <tr><td style="color:#6b7280;padding:4px 0">Currency:</td><td style="text-align:right">${inv.currency}</td></tr>
            </table>
            <div style="border-top:1px solid #e5e7eb;padding-top:16px">
              <table style="width:100%;font-size:14px">
                <tr><td style="color:#6b7280;padding:6px 0">Subtotal</td><td style="text-align:right">${fmt(Number(inv.subtotal), inv.currency)}</td></tr>
                ${inv.discount_amount ? `<tr><td style="color:#6b7280;padding:6px 0">Discount</td><td style="text-align:right;color:#10b981">-${fmt(inv.discount_amount, inv.currency)}</td></tr>` : ""}
                <tr><td style="color:#6b7280;padding:6px 0">Tax</td><td style="text-align:right">${fmt(Number(inv.tax_amount), inv.currency)}</td></tr>
                <tr style="border-top:2px solid #111827"><td style="padding:12px 0;font-weight:700;font-size:16px">Total Due</td><td style="text-align:right;font-weight:700;font-size:18px">${fmt(inv.amount, inv.currency)}</td></tr>
              </table>
            </div>
            ${inv.notes ? `<div style="margin-top:16px;padding:12px;background:#f9fafb;border-radius:8px;font-size:13px;color:#6b7280">${inv.notes}</div>` : ""}
            ${inv.share_token ? `<div style="margin-top:24px;text-align:center"><a href="${getShareLink(inv)}" style="display:inline-block;padding:12px 32px;background:#6366f1;color:white;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">View & Pay Invoice</a></div>` : ""}
          </div>
        </div>
      </div>
    `;
  }

  // Filter
  const filtered = invoices.filter((inv) => {
    const matchSearch = !search ||
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      inv.client.toLowerCase().includes(search.toLowerCase()) ||
      (inv.client_email || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Stats
  const paid = invoices.filter((i) => i.status === "Paid").reduce((a, b) => a + b.amount, 0);
  const pending = invoices.filter((i) => i.status === "Pending").reduce((a, b) => a + b.amount, 0);
  const overdue = invoices.filter((i) => i.status === "Overdue").reduce((a, b) => a + b.amount, 0);
  const totalTax = invoices.reduce((a, b) => a + (Number(b.tax_amount) || 0), 0);
  const draftCount = invoices.filter((i) => i.status === "Draft").length;

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">Create, send, and track invoices</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToCSV(invoices.map((i) => ({
              Invoice: i.invoice_number, Client: i.client, Email: i.client_email, Subtotal: i.subtotal, Tax: i.tax_amount, Total: i.amount, Status: i.status, Due: i.due_date || "N/A", Sent: i.sent_via || "—",
            })), "invoices")}
            className="h-9 px-3 rounded-lg border border-input bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-2"
          >
            <Download className="h-4 w-4" /> Export
          </button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Invoice
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Outstanding", value: fmt(pending + overdue), sub: `${invoices.filter((i) => i.status === "Pending" || i.status === "Overdue").length} invoices`, color: "text-foreground" },
          { label: "Paid", value: fmt(paid), sub: `${invoices.filter((i) => i.status === "Paid").length} invoices`, color: "text-green-600" },
          { label: "Overdue", value: fmt(overdue), sub: `${invoices.filter((i) => i.status === "Overdue").length} invoices`, color: "text-destructive" },
          { label: "Total Tax", value: fmt(totalTax), sub: "collected", color: "text-amber-600" },
          { label: "Drafts", value: String(draftCount), sub: "unsent", color: "text-muted-foreground" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-lg sm:text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoices..." className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-background text-sm" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 px-4 rounded-lg border border-input bg-background text-sm">
          <option value="all">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Pending">Pending</option>
          <option value="Paid">Paid</option>
          <option value="Overdue">Overdue</option>
        </select>
      </div>

      {/* Invoice Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No invoices found</p>
          <Button className="mt-4" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> Create Invoice</Button>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden lg:block bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Invoice</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Client</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Due Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Sent</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((inv) => {
                  const st = STATUS_MAP[inv.status] || STATUS_MAP.Draft;
                  const StIcon = st.icon;
                  return (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-foreground">{inv.invoice_number}</p>
                        <p className="text-[11px] text-muted-foreground">{inv.items_count} items • {inv.currency}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground">{inv.client}</p>
                        {inv.client_email && <p className="text-[11px] text-muted-foreground">{inv.client_email}</p>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-sm font-bold text-foreground">{fmt(inv.amount, inv.currency)}</p>
                        {Number(inv.tax_amount) > 0 && <p className="text-[10px] text-amber-600">Tax: {fmt(Number(inv.tax_amount), inv.currency)}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                          <StIcon className="h-3 w-3" /> {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {inv.sent_via ? (
                          <span className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                            {inv.sent_via === "email" && <Mail className="h-3 w-3" />}
                            {inv.sent_via === "sms" && <MessageSquare className="h-3 w-3" />}
                            {inv.sent_via === "link" && <Link2 className="h-3 w-3" />}
                            {inv.sent_via}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">Not sent</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setPreviewInvoice(inv)} className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors" title="Preview"><Eye className="h-4 w-4" /></button>
                          <button onClick={() => setSendDialogInvoice(inv)} className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors" title="Send"><Send className="h-4 w-4" /></button>
                          <button onClick={() => copyLink(inv)} className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors" title="Copy link">
                            {linkCopied === inv.id ? <Check className="h-4 w-4 text-green-600" /> : <Link2 className="h-4 w-4" />}
                          </button>
                          <button onClick={() => printInvoice(inv)} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors" title="Print"><Printer className="h-4 w-4" /></button>
                          <button onClick={async () => {
                            try {
                              const { data, error } = await supabase.functions.invoke("invoice-pdf", { body: { invoice_id: inv.id } });
                              if (error) throw error;
                              if (data?.html) { const w = window.open("", "_blank"); if (w) { w.document.write(data.html); w.document.close(); } }
                            } catch { toast.error("Failed to generate PDF"); }
                          }} className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors" title="Download PDF"><Download className="h-4 w-4" /></button>
                          {inv.status !== "Paid" && (
                            <button onClick={() => markAsPaid(inv.id)} className="p-1.5 rounded-md text-muted-foreground hover:bg-green-500/10 hover:text-green-600 transition-colors" title="Mark paid"><CheckCircle className="h-4 w-4" /></button>
                          )}
                          <button onClick={() => deleteInvoice(inv.id)} className="p-1.5 rounded-md text-destructive/50 hover:bg-destructive/10 hover:text-destructive transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {filtered.map((inv) => {
              const st = STATUS_MAP[inv.status] || STATUS_MAP.Draft;
              const StIcon = st.icon;
              return (
                <div key={inv.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{inv.invoice_number}</p>
                      <p className="text-xs text-muted-foreground">{inv.client}</p>
                      {inv.client_email && <p className="text-[10px] text-muted-foreground">{inv.client_email}</p>}
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${st.color}`}>
                      <StIcon className="h-3 w-3" /> {st.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {inv.due_date ? `Due ${new Date(inv.due_date).toLocaleDateString()}` : "No due date"}
                    </div>
                    <span className="text-lg font-bold text-foreground">{fmt(inv.amount, inv.currency)}</span>
                  </div>
                  <div className="flex items-center gap-1 border-t border-border pt-2">
                    <button onClick={() => setPreviewInvoice(inv)} className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10"><Eye className="h-4 w-4" /></button>
                    <button onClick={() => setSendDialogInvoice(inv)} className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10"><Send className="h-4 w-4" /></button>
                    <button onClick={() => copyLink(inv)} className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10">
                      {linkCopied === inv.id ? <Check className="h-4 w-4 text-green-600" /> : <Link2 className="h-4 w-4" />}
                    </button>
                    <button onClick={() => printInvoice(inv)} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted"><Printer className="h-4 w-4" /></button>
                    {inv.status !== "Paid" && <button onClick={() => markAsPaid(inv.id)} className="p-1.5 rounded-md text-green-600 hover:bg-green-500/10"><CheckCircle className="h-4 w-4" /></button>}
                    <button onClick={() => deleteInvoice(inv.id)} className="p-1.5 rounded-md text-destructive/50 hover:bg-destructive/10 ml-auto"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <p className="text-xs text-muted-foreground">{invoices.length} total invoices</p>

      {/* ============ CREATE INVOICE DIALOG ============ */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" onClick={resetForm} />
          <div className="relative w-full max-w-3xl bg-card border border-border rounded-2xl shadow-xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
              <div>
                <h2 className="text-lg font-bold text-foreground">New Invoice</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Fill in the details to create and send</p>
              </div>
              <button onClick={resetForm} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-5">
              {/* Client Details */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Client Name *</label>
                    <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Acme Corp" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                    <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="billing@acme.com" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
                    <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+1234567890" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Address</label>
                    <input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="123 Main St, City" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
                  </div>
                </div>
              </div>

              {/* Invoice Settings */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invoice Settings</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Currency</label>
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                      {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Payment Terms</label>
                    <select value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                      {PAYMENT_TERMS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Due Date</label>
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Tax Profile</label>
                    <select value={selectedTaxProfile} onChange={(e) => setSelectedTaxProfile(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                      <option value="">No Tax</option>
                      {taxProfiles.map((tp) => (
                        <option key={tp.id} value={tp.id}>
                          {tp.name} ({tp.tax_rates.map((r) => `${r.rate}%`).join("+")})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Line Items</h3>
                  <button onClick={addItem} className="text-xs font-medium text-primary hover:underline flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Add</button>
                </div>
                <div className="space-y-2">
                  <div className="hidden sm:grid grid-cols-[1fr_80px_100px_80px_40px] gap-2 text-xs font-medium text-muted-foreground px-1">
                    <span>Description</span><span>Qty</span><span>Unit Price</span><span>Amount</span><span></span>
                  </div>
                  {items.map((item, i) => (
                    <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_80px_100px_80px_40px] gap-2 bg-muted/30 rounded-lg p-2">
                      <input value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} placeholder="Item description" className="h-9 rounded-lg border border-input bg-background px-3 text-sm" />
                      <input type="number" value={item.quantity || ""} onChange={(e) => updateItem(i, "quantity", parseFloat(e.target.value) || 0)} placeholder="Qty" className="h-9 rounded-lg border border-input bg-background px-3 text-sm" />
                      <input type="number" value={item.unit_price || ""} onChange={(e) => updateItem(i, "unit_price", parseFloat(e.target.value) || 0)} placeholder="Price" step="0.01" className="h-9 rounded-lg border border-input bg-background px-3 text-sm" />
                      <div className="h-9 flex items-center text-sm font-mono text-muted-foreground px-1">{fmt(item.quantity * item.unit_price, currency)}</div>
                      {items.length > 1 && (
                        <button onClick={() => removeItem(i)} className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Discount */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Discount</h3>
                <div className="grid grid-cols-2 gap-3">
                  <select value={discountType} onChange={(e) => setDiscountType(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                    <option value="">No Discount</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount</option>
                  </select>
                  {discountType && (
                    <input type="number" step="0.01" value={discountValue || ""} onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)} placeholder={discountType === "percentage" ? "10" : "50.00"} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Payment instructions, terms, etc." className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              </div>

              {/* Totals */}
              <div className="bg-muted/40 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-medium text-foreground">{fmt(subtotal, currency)}</span></div>
                {discountAmt > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Discount {discountType === "percentage" ? `(${discountValue}%)` : ""}</span><span className="font-medium text-green-600">-{fmt(discountAmt, currency)}</span></div>}
                {currentProfile && currentProfile.tax_rates.map((rate, i) => {
                  const base = rate.is_compound ? afterDiscount + calcTax(afterDiscount, { ...currentProfile, tax_rates: currentProfile.tax_rates.slice(0, i) }) : afterDiscount;
                  const amount = rate.tax_type === "percentage" ? base * (rate.rate / 100) : rate.rate;
                  return (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{rate.name} ({rate.rate}{rate.tax_type === "percentage" ? "%" : " flat"})</span>
                      <span className="font-medium text-amber-600">{fmt(amount, currency)}</span>
                    </div>
                  );
                })}
                <div className="border-t border-border pt-2 flex justify-between">
                  <span className="font-bold text-foreground">Total</span>
                  <span className="text-lg font-bold text-foreground">{fmt(total, currency)}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={resetForm} className="flex-1">Cancel</Button>
                <Button variant="outline" onClick={() => handleSubmit(true)} loading={formSaving} className="flex-1">
                  <FileText className="h-4 w-4 mr-2" /> Save Draft
                </Button>
                <Button onClick={() => handleSubmit(false)} loading={formSaving} className="flex-1">
                  <Plus className="h-4 w-4 mr-2" /> Create Invoice
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ SEND DIALOG ============ */}
      {sendDialogInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setSendDialogInvoice(null)} />
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-xl animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2 className="text-base font-bold text-foreground">Send {sendDialogInvoice.invoice_number}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">To {sendDialogInvoice.client} — {fmt(sendDialogInvoice.amount, sendDialogInvoice.currency)}</p>
              </div>
              <button onClick={() => setSendDialogInvoice(null)} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              {/* Send via Email */}
              <button
                onClick={() => sendEmail(sendDialogInvoice)}
                disabled={sending || !sendDialogInvoice.client_email}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-left disabled:opacity-40 disabled:pointer-events-none"
              >
                <div className="p-2.5 rounded-lg bg-blue-500/10"><Mail className="h-5 w-5 text-blue-600" /></div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Send via Email</p>
                  <p className="text-xs text-muted-foreground">{sendDialogInvoice.client_email || "No email set on invoice"}</p>
                </div>
                {sending && <Spinner size="sm" />}
              </button>

              {/* Send via SMS */}
              <button
                onClick={() => sendSms(sendDialogInvoice)}
                disabled={sending || !sendDialogInvoice.client_phone}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-left disabled:opacity-40 disabled:pointer-events-none"
              >
                <div className="p-2.5 rounded-lg bg-green-500/10"><MessageSquare className="h-5 w-5 text-green-600" /></div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Send via SMS</p>
                  <p className="text-xs text-muted-foreground">{sendDialogInvoice.client_phone || "No phone set on invoice"}</p>
                </div>
                {sending && <Spinner size="sm" />}
              </button>

              {/* Copy Link */}
              <button
                onClick={() => { copyLink(sendDialogInvoice); setSendDialogInvoice(null); }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-left"
              >
                <div className="p-2.5 rounded-lg bg-purple-500/10"><Link2 className="h-5 w-5 text-purple-600" /></div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Copy Shareable Link</p>
                  <p className="text-xs text-muted-foreground">Share via any channel</p>
                </div>
                <Copy className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ PREVIEW DIALOG ============ */}
      {previewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setPreviewInvoice(null)} />
          <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="text-base font-bold text-foreground">Invoice Preview</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => { setSendDialogInvoice(previewInvoice); setPreviewInvoice(null); }} className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary"><Send className="h-4 w-4" /></button>
                <button onClick={() => printInvoice(previewInvoice)} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted"><Printer className="h-4 w-4" /></button>
                <button onClick={() => setPreviewInvoice(null)} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted"><X className="h-5 w-5" /></button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              {/* Invoice Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold text-foreground">Invoice</h3>
                  <p className="text-sm text-muted-foreground font-mono">{previewInvoice.invoice_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Issue Date</p>
                  <p className="text-sm font-medium text-foreground">{new Date(previewInvoice.issue_date).toLocaleDateString()}</p>
                  {previewInvoice.due_date && (
                    <>
                      <p className="text-xs text-muted-foreground mt-1">Due Date</p>
                      <p className="text-sm font-medium text-foreground">{new Date(previewInvoice.due_date).toLocaleDateString()}</p>
                    </>
                  )}
                </div>
              </div>

              {/* Bill To */}
              <div className="bg-muted/30 rounded-xl p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Bill To</p>
                <p className="text-sm font-bold text-foreground">{previewInvoice.client}</p>
                {previewInvoice.client_email && <p className="text-xs text-muted-foreground">{previewInvoice.client_email}</p>}
                {previewInvoice.client_phone && <p className="text-xs text-muted-foreground">{previewInvoice.client_phone}</p>}
                {previewInvoice.client_address && <p className="text-xs text-muted-foreground">{previewInvoice.client_address}</p>}
              </div>

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium text-foreground">{fmt(Number(previewInvoice.subtotal), previewInvoice.currency)}</span>
                </div>
                {Number(previewInvoice.discount_amount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-medium text-green-600">-{fmt(Number(previewInvoice.discount_amount), previewInvoice.currency)}</span>
                  </div>
                )}
                {Number(previewInvoice.tax_amount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="font-medium text-amber-600">{fmt(Number(previewInvoice.tax_amount), previewInvoice.currency)}</span>
                  </div>
                )}
                <div className="border-t border-border pt-3 flex justify-between">
                  <span className="font-bold text-foreground text-base">Total Due</span>
                  <span className="text-xl font-bold text-foreground">{fmt(previewInvoice.amount, previewInvoice.currency)}</span>
                </div>
              </div>

              {/* Status & Sent Info */}
              <div className="flex items-center justify-between bg-muted/30 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  {(() => { const st = STATUS_MAP[previewInvoice.status] || STATUS_MAP.Draft; const StIcon = st.icon; return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${st.color}`}><StIcon className="h-3 w-3" /> {st.label}</span>; })()}
                </div>
                {previewInvoice.sent_via && (
                  <p className="text-xs text-muted-foreground capitalize">Sent via {previewInvoice.sent_via} {previewInvoice.sent_at && `• ${new Date(previewInvoice.sent_at).toLocaleDateString()}`}</p>
                )}
              </div>

              {previewInvoice.notes && (
                <div className="bg-muted/30 rounded-xl p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-sm text-foreground">{previewInvoice.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
