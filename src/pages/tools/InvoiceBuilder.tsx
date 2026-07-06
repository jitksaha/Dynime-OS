import { useState } from "react";
import { Plus, Trash2, Download, FileText, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";
import { printStyledInvoice } from "@/lib/print-templates";
import { toast } from "sonner";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

const currencies = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
];

function newLineItem(): LineItem {
  return { id: crypto.randomUUID(), description: "", quantity: 1, unit_price: 0, tax_rate: 0 };
}

export default function InvoiceBuilder() {
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now().toString(36).toUpperCase()}`);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState(0);
  const [items, setItems] = useState<LineItem[]>([newLineItem()]);

  const addItem = () => setItems(prev => [...prev, newLineItem()]);
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  const updateItem = (id: string, field: keyof LineItem, value: any) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
  const discountAmt = discountType === "percentage" ? subtotal * (discountValue / 100) : discountValue;
  const taxAmt = items.reduce((sum, i) => sum + (i.quantity * i.unit_price * i.tax_rate / 100), 0);
  const total = subtotal - discountAmt + taxAmt;

  const buildInvoiceData = () => ({
    invoice_number: invoiceNumber,
    issue_date: issueDate,
    due_date: dueDate || null,
    client: clientName || "—",
    client_email: clientEmail || null,
    client_phone: clientPhone || null,
    client_address: clientAddress || null,
    company_address: companyAddress || null,
    currency,
    notes: notes || null,
    amount: total,
    subtotal,
    discount_amount: discountAmt,
    tax_amount: taxAmt,
    share_token: null,
    line_items: items.filter(i => i.description).map(i => ({
      description: i.description,
      quantity: i.quantity,
      unit_price: i.unit_price,
      tax_rate: i.tax_rate || 0,
    })),
  });

  const handlePreview = () => {
    if (!items.some(i => i.description)) {
      toast.error("Add at least one item");
      return;
    }
    printStyledInvoice(buildInvoiceData(), companyName || "Your Company");
  };

  const fmt = (n: number) => {
    try { return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(n); }
    catch { return `${currency} ${n.toFixed(2)}`; }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicNavbar />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Receipt className="h-4 w-4" />
              Free Tool — No Sign-up Required
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-3">
              Invoice Generator
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Create professional invoices in seconds. Fill in the details below and download a beautifully designed PDF — completely free.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ── Left: Form ── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Your Business */}
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Your Business</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Company Name</Label>
                      <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Inc." />
                    </div>
                    <div>
                      <Label>Currency</Label>
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {currencies.map(c => (
                            <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Company Address</Label>
                    <Textarea value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} placeholder="123 Main St, City, Country" rows={2} />
                  </div>
                </CardContent>
              </Card>

              {/* Client */}
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Bill To</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><Label>Client Name</Label><Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Client name" /></div>
                    <div><Label>Email</Label><Input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@email.com" /></div>
                    <div><Label>Phone</Label><Input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="+1 234 567 890" /></div>
                    <div><Label>Address</Label><Input value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="Client address" /></div>
                  </div>
                </CardContent>
              </Card>

              {/* Invoice Details */}
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Invoice Details</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div><Label>Invoice Number</Label><Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} /></div>
                    <div><Label>Issue Date</Label><Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} /></div>
                    <div><Label>Due Date</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
                  </div>
                </CardContent>
              </Card>

              {/* Line Items */}
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Items</h2>

                  <div className="hidden sm:grid grid-cols-[1fr_80px_110px_80px_100px_36px] gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                    <span>Description</span><span>Qty</span><span>Unit Price</span><span>Tax %</span><span>Total</span><span />
                  </div>

                  {items.map((item) => (
                    <div key={item.id} className="grid grid-cols-1 sm:grid-cols-[1fr_80px_110px_80px_100px_36px] gap-2 items-center">
                      <Input placeholder="Item description" value={item.description} onChange={e => updateItem(item.id, "description", e.target.value)} />
                      <Input type="number" min={1} value={item.quantity} onChange={e => updateItem(item.id, "quantity", Number(e.target.value))} />
                      <Input type="number" min={0} step={0.01} value={item.unit_price} onChange={e => updateItem(item.id, "unit_price", Number(e.target.value))} />
                      <Input type="number" min={0} max={100} value={item.tax_rate} onChange={e => updateItem(item.id, "tax_rate", Number(e.target.value))} />
                      <div className="text-sm font-semibold text-foreground tabular-nums px-1">{fmt(item.quantity * item.unit_price)}</div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(item.id)} disabled={items.length === 1}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <Button variant="outline" size="sm" onClick={addItem} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Add Item
                  </Button>
                </CardContent>
              </Card>

              {/* Discount & Notes */}
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Discount & Notes</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label>Discount Type</Label>
                      <Select value={discountType} onValueChange={v => setDiscountType(v as any)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Discount Value</Label>
                      <Input type="number" min={0} value={discountValue} onChange={e => setDiscountValue(Number(e.target.value))} />
                    </div>
                  </div>
                  <div>
                    <Label>Notes / Payment Instructions</Label>
                    <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Payment terms, bank details, thank you note..." rows={3} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Right: Live Summary ── */}
            <div className="lg:col-span-1">
              <div className="sticky top-20">
                <Card className="border-primary/20 shadow-lg">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                      <FileText className="h-5 w-5" />
                      <h3 className="font-bold">Invoice Summary</h3>
                    </div>

                    <Separator />

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Invoice</span><span className="font-mono text-xs">{invoiceNumber}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Client</span><span className="font-semibold truncate max-w-[140px]">{clientName || "—"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Items</span><span>{items.filter(i => i.description).length}</span></div>
                    </div>

                    <Separator />

                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{fmt(subtotal)}</span></div>
                      {discountAmt > 0 && (
                        <div className="flex justify-between text-red-500"><span>Discount</span><span className="tabular-nums">−{fmt(discountAmt)}</span></div>
                      )}
                      {taxAmt > 0 && (
                        <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="tabular-nums">{fmt(taxAmt)}</span></div>
                      )}
                    </div>

                    <Separator />

                    <div className="flex justify-between items-center">
                      <span className="font-bold text-foreground">Total</span>
                      <span className="text-xl font-extrabold text-foreground tabular-nums">{fmt(total)}</span>
                    </div>

                    <Button className="w-full gap-2 mt-4" size="lg" onClick={handlePreview}>
                      <Download className="h-4 w-4" />
                      Generate & Download PDF
                    </Button>

                    <p className="text-[11px] text-center text-muted-foreground">
                      Opens in a new tab — use your browser's print dialog to save as PDF
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
