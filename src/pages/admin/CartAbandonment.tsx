import { useState, useEffect } from "react";
import {
  ShoppingCart, Send, Gift, Eye, RefreshCw, Filter,
  TrendingUp, Clock, CheckCircle2, XCircle, Mail,
  Percent, DollarSign, BarChart3, Users, AlertTriangle,
  Plus, Trash2, ToggleLeft, ToggleRight, Edit2, Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

/* ───────── Types ───────── */
interface AbandonedCart {
  id: string;
  user_id: string;
  tenant_id: string | null;
  cart_type: string;
  item_name: string;
  item_description: string | null;
  plan_id: string | null;
  billing_cycle: string | null;
  addon_id: string | null;
  amount: number;
  currency: string;
  status: string;
  recovery_email_sent: boolean;
  recovery_email_sent_at: string | null;
  recovered_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: any;
  profile?: { full_name: string; avatar_url: string | null } | null;
  user_email?: string;
}

interface RecoveryOffer {
  id: string;
  name: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  max_discount_amount: number | null;
  valid_hours: number;
  is_active: boolean;
  auto_apply: boolean;
  usage_count: number;
  max_uses: number;
  created_at: string;
}

/* ───────── Component ───────── */
export default function CartAbandonment() {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [offers, setOffers] = useState<RecoveryOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCart, setSelectedCart] = useState<AbandonedCart | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<RecoveryOffer | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string>("");
  const [recoveryChannel, setRecoveryChannel] = useState("email");
  const [offerForm, setOfferForm] = useState({
    name: "", description: "", discount_type: "percentage",
    discount_value: 10, max_discount_amount: 0, valid_hours: 48,
    is_active: true, auto_apply: false, max_uses: 0,
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [cartsRes, offersRes] = await Promise.all([
      supabase.from("abandoned_carts").select("*").order("created_at", { ascending: false }),
      supabase.from("cart_recovery_offers").select("*").order("created_at", { ascending: false }),
    ]);

    if (cartsRes.data) {
      // Fetch user emails from profiles
      const userIds = [...new Set((cartsRes.data as any[]).map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles").select("user_id, full_name, avatar_url")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      setCarts((cartsRes.data as any[]).map(c => ({
        ...c,
        profile: profileMap.get(c.user_id) || null,
      })));
    }
    if (offersRes.data) setOffers(offersRes.data as any[]);
    setLoading(false);
  };

  /* ── Stats ── */
  const totalAbandoned = carts.length;
  const pendingCarts = carts.filter(c => c.status === "abandoned").length;
  const recoveredCarts = carts.filter(c => c.status === "recovered").length;
  const recoveryRate = totalAbandoned > 0 ? ((recoveredCarts / totalAbandoned) * 100).toFixed(1) : "0";
  const totalLostRevenue = carts.filter(c => c.status === "abandoned").reduce((s, c) => s + Number(c.amount), 0);
  const totalRecoveredRevenue = carts.filter(c => c.status === "recovered").reduce((s, c) => s + Number(c.amount), 0);

  /* ── Filters ── */
  const filteredCarts = carts.filter(c => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return c.item_name.toLowerCase().includes(term) ||
        (c.profile?.full_name || "").toLowerCase().includes(term) ||
        c.cart_type.toLowerCase().includes(term);
    }
    return true;
  });

  /* ── Send Recovery ── */
  const handleSendRecovery = async () => {
    if (!selectedCart) return;
    try {
      // Log the recovery attempt
      const { error: logErr } = await supabase.from("cart_recovery_logs").insert({
        abandoned_cart_id: selectedCart.id,
        offer_id: selectedOfferId || null,
        channel: recoveryChannel,
        status: "sent",
      } as any);
      if (logErr) throw logErr;

      // Update cart
      await supabase.from("abandoned_carts").update({
        recovery_email_sent: true,
        recovery_email_sent_at: new Date().toISOString(),
        recovery_offer_id: selectedOfferId || null,
        updated_at: new Date().toISOString(),
      } as any).eq("id", selectedCart.id);

      // If offer selected, increment usage
      if (selectedOfferId) {
        const offer = offers.find(o => o.id === selectedOfferId);
        if (offer) {
          await supabase.from("cart_recovery_offers").update({
            usage_count: offer.usage_count + 1,
          } as any).eq("id", selectedOfferId);
        }
      }

      toast.success(`Recovery notification sent via ${recoveryChannel}`);
      setSendDialogOpen(false);
      setSelectedCart(null);
      setSelectedOfferId("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to send recovery");
    }
  };

  /* ── Mark as Recovered ── */
  const handleMarkRecovered = async (cartId: string) => {
    await supabase.from("abandoned_carts").update({
      status: "recovered",
      recovered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any).eq("id", cartId);
    toast.success("Cart marked as recovered");
    fetchData();
  };

  /* ── Dismiss Cart ── */
  const handleDismiss = async (cartId: string) => {
    await supabase.from("abandoned_carts").update({
      status: "dismissed",
      updated_at: new Date().toISOString(),
    } as any).eq("id", cartId);
    toast.success("Cart dismissed");
    fetchData();
  };

  /* ── Offer CRUD ── */
  const handleSaveOffer = async () => {
    try {
      if (editingOffer) {
        const { error } = await supabase.from("cart_recovery_offers").update({
          ...offerForm, updated_at: new Date().toISOString(),
        } as any).eq("id", editingOffer.id);
        if (error) throw error;
        toast.success("Offer updated");
      } else {
        const { error } = await supabase.from("cart_recovery_offers").insert({
          ...offerForm,
        } as any);
        if (error) throw error;
        toast.success("Offer created");
      }
      setOfferDialogOpen(false);
      resetOfferForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteOffer = async (id: string) => {
    await supabase.from("cart_recovery_offers").delete().eq("id", id);
    toast.success("Offer deleted");
    fetchData();
  };

  const handleToggleOffer = async (offer: RecoveryOffer) => {
    await supabase.from("cart_recovery_offers").update({
      is_active: !offer.is_active,
    } as any).eq("id", offer.id);
    fetchData();
  };

  const resetOfferForm = () => {
    setEditingOffer(null);
    setOfferForm({
      name: "", description: "", discount_type: "percentage",
      discount_value: 10, max_discount_amount: 0, valid_hours: 48,
      is_active: true, auto_apply: false, max_uses: 0,
    });
  };

  const openEditOffer = (offer: RecoveryOffer) => {
    setEditingOffer(offer);
    setOfferForm({
      name: offer.name,
      description: offer.description || "",
      discount_type: offer.discount_type,
      discount_value: offer.discount_value,
      max_discount_amount: offer.max_discount_amount || 0,
      valid_hours: offer.valid_hours,
      is_active: offer.is_active,
      auto_apply: offer.auto_apply,
      max_uses: offer.max_uses,
    });
    setOfferDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "abandoned": return <Badge variant="destructive" className="gap-1"><Clock className="h-3 w-3" />Abandoned</Badge>;
      case "recovered": return <Badge className="bg-emerald-500/15 text-emerald-600 gap-1"><CheckCircle2 className="h-3 w-3" />Recovered</Badge>;
      case "dismissed": return <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" />Dismissed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const timeSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return "< 1h ago";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            Cart Abandonment
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and recover abandoned subscriptions, addons, and purchases
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
        <Card><CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1"><ShoppingCart className="h-3.5 w-3.5" />Total Carts</div>
          <div className="text-2xl font-bold text-foreground">{totalAbandoned}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1"><AlertTriangle className="h-3.5 w-3.5" />Pending</div>
          <div className="text-2xl font-bold text-orange-500">{pendingCarts}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1"><CheckCircle2 className="h-3.5 w-3.5" />Recovered</div>
          <div className="text-2xl font-bold text-emerald-500">{recoveredCarts}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1"><TrendingUp className="h-3.5 w-3.5" />Recovery Rate</div>
          <div className="text-2xl font-bold text-primary">{recoveryRate}%</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1"><DollarSign className="h-3.5 w-3.5" />Lost Revenue</div>
          <div className="text-2xl font-bold text-destructive">${totalLostRevenue.toFixed(0)}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1"><DollarSign className="h-3.5 w-3.5" />Recovered $</div>
          <div className="text-2xl font-bold text-emerald-500">${totalRecoveredRevenue.toFixed(0)}</div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="carts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="carts" className="gap-1"><ShoppingCart className="h-4 w-4" />Abandoned Carts</TabsTrigger>
          <TabsTrigger value="offers" className="gap-1"><Gift className="h-4 w-4" />Recovery Offers</TabsTrigger>
        </TabsList>

        {/* ── Abandoned Carts Tab ── */}
        <TabsContent value="carts" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, type..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><Filter className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="abandoned">Abandoned</SelectItem>
                <SelectItem value="recovered">Recovered</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Notified</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filteredCarts.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No abandoned carts found
                  </TableCell></TableRow>
                ) : filteredCarts.map(cart => (
                  <TableRow key={cart.id}>
                    <TableCell>
                      <div className="font-medium text-foreground text-sm">{cart.profile?.full_name || "Unknown User"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{cart.item_name}</div>
                      {cart.item_description && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{cart.item_description}</div>}
                    </TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{cart.cart_type}</Badge></TableCell>
                    <TableCell className="font-semibold">{cart.currency} {Number(cart.amount).toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(cart.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{timeSince(cart.created_at)}</TableCell>
                    <TableCell>
                      {cart.recovery_email_sent ? (
                        <Badge variant="secondary" className="gap-1 text-xs"><Mail className="h-3 w-3" />Sent</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        {cart.status === "abandoned" && (
                          <>
                            <Button size="sm" variant="default" className="h-7 text-xs gap-1"
                              onClick={() => { setSelectedCart(cart); setSendDialogOpen(true); }}>
                              <Send className="h-3 w-3" />Recover
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs"
                              onClick={() => handleMarkRecovered(cart.id)}>
                              <CheckCircle2 className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs"
                              onClick={() => handleDismiss(cart.id)}>
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── Recovery Offers Tab ── */}
        <TabsContent value="offers" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Create special offers to incentivize users to complete their purchase.</p>
            <Button onClick={() => { resetOfferForm(); setOfferDialogOpen(true); }} className="gap-1">
              <Plus className="h-4 w-4" />Create Offer
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {offers.length === 0 ? (
              <Card className="col-span-full"><CardContent className="py-12 text-center text-muted-foreground">
                <Gift className="h-8 w-8 mx-auto mb-2 opacity-40" />
                No recovery offers yet. Create one to start recovering abandoned carts.
              </CardContent></Card>
            ) : offers.map(offer => (
              <Card key={offer.id} className={`relative ${!offer.is_active ? "opacity-60" : ""}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{offer.name}</CardTitle>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditOffer(offer)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleToggleOffer(offer)}>
                        {offer.is_active ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDeleteOffer(offer.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {offer.description && <p className="text-xs text-muted-foreground">{offer.description}</p>}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="gap-1">
                      {offer.discount_type === "percentage" ? <Percent className="h-3 w-3" /> : <DollarSign className="h-3 w-3" />}
                      {offer.discount_value}{offer.discount_type === "percentage" ? "% OFF" : " OFF"}
                    </Badge>
                    <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />{offer.valid_hours}h validity</Badge>
                    {offer.auto_apply && <Badge className="bg-primary/15 text-primary gap-1">Auto-Apply</Badge>}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Used: {offer.usage_count}{offer.max_uses > 0 ? `/${offer.max_uses}` : ""}</span>
                    {offer.max_discount_amount ? <span>Max: ${offer.max_discount_amount}</span> : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Send Recovery Dialog ── */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Send className="h-5 w-5 text-primary" />Send Recovery Notification</DialogTitle>
            <DialogDescription>
              Send a reminder to {selectedCart?.profile?.full_name || "the user"} to complete their purchase of "{selectedCart?.item_name}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Channel</Label>
              <Select value={recoveryChannel} onValueChange={setRecoveryChannel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="in_app">In-App Notification</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Attach Recovery Offer (Optional)</Label>
              <Select value={selectedOfferId} onValueChange={setSelectedOfferId}>
                <SelectTrigger><SelectValue placeholder="No offer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Offer</SelectItem>
                  {offers.filter(o => o.is_active).map(o => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name} — {o.discount_value}{o.discount_type === "percentage" ? "%" : "$"} OFF
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
              <div className="text-xs text-muted-foreground">Preview</div>
              <p className="text-sm font-medium">Hey {selectedCart?.profile?.full_name || "there"}! 👋</p>
              <p className="text-sm text-muted-foreground">
                You left "{selectedCart?.item_name}" in your cart worth {selectedCart?.currency} {Number(selectedCart?.amount || 0).toFixed(2)}.
                {selectedOfferId && (() => {
                  const o = offers.find(o => o.id === selectedOfferId);
                  return o ? ` Use your special ${o.discount_value}${o.discount_type === "percentage" ? "%" : "$"} discount before it expires!` : "";
                })()}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendRecovery} className="gap-1"><Send className="h-4 w-4" />Send Recovery</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Offer Create/Edit Dialog ── */}
      <Dialog open={offerDialogOpen} onOpenChange={v => { if (!v) resetOfferForm(); setOfferDialogOpen(v); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Gift className="h-5 w-5 text-primary" />{editingOffer ? "Edit" : "Create"} Recovery Offer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Offer Name *</Label>
              <Input value={offerForm.name} onChange={e => setOfferForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Come Back 10% OFF" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={offerForm.description} onChange={e => setOfferForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe the offer..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Discount Type</Label>
                <Select value={offerForm.discount_type} onValueChange={v => setOfferForm(p => ({ ...p, discount_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Discount Value</Label>
                <Input type="number" value={offerForm.discount_value} onChange={e => setOfferForm(p => ({ ...p, discount_value: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Max Discount ($)</Label>
                <Input type="number" value={offerForm.max_discount_amount} onChange={e => setOfferForm(p => ({ ...p, max_discount_amount: Number(e.target.value) }))} placeholder="0 = no limit" />
              </div>
              <div>
                <Label>Valid Hours</Label>
                <Input type="number" value={offerForm.valid_hours} onChange={e => setOfferForm(p => ({ ...p, valid_hours: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Max Uses (0 = unlimited)</Label>
                <Input type="number" value={offerForm.max_uses} onChange={e => setOfferForm(p => ({ ...p, max_uses: Number(e.target.value) }))} />
              </div>
              <div className="space-y-3 pt-5">
                <div className="flex items-center gap-2">
                  <Switch checked={offerForm.auto_apply} onCheckedChange={v => setOfferForm(p => ({ ...p, auto_apply: v }))} />
                  <Label className="text-sm">Auto-apply to abandoned carts</Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetOfferForm(); setOfferDialogOpen(false); }}>Cancel</Button>
            <Button onClick={handleSaveOffer} disabled={!offerForm.name.trim()}>{editingOffer ? "Update" : "Create"} Offer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
