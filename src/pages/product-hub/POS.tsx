import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Search, Plus, Minus, ShoppingCart, CreditCard, Banknote,
  Smartphone, Receipt, Package, CheckCircle2, X, Percent, User,
  Trash2, Clock, Printer, ArrowRight, ScanLine, Settings2, QrCode,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { usePosConfig } from "@/hooks/usePosConfig";
import { printPosReceipt } from "@/lib/print-templates";
import { BarcodeScanner, useBarcodeScanListener } from "@/components/pos/BarcodeScanner";
import { BarcodeDisplay } from "@/components/pos/BarcodeGenerator";
import { PosTypeSwitcher } from "@/components/pos/PosTypeSwitcher";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: string;
  price: number;
  cost_price: number;
  stock_quantity: number;
  image_url: string | null;
  is_active: boolean;
}

interface CartItem {
  product: Product;
  quantity: number;
}

type PaymentMethod = "cash" | "card" | "mobile";

export default function POSPage() {
  const { tenantId, userId, applyBranchFilter, activeBranchId } = useTenant();
  const { formatPrice } = useTenantCurrency();
  const { businessType } = usePosConfig();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  const [taxRate, setTaxRate] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashReceived, setCashReceived] = useState(0);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [holdOrders, setHoldOrders] = useState<{ cart: CartItem[]; customer: string; time: string }[]>([]);
  const [showHoldList, setShowHoldList] = useState(false);
  const [showRecentSales, setShowRecentSales] = useState(false);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [typeSwitcherOpen, setTypeSwitcherOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: focus search on F2, checkout on F9, scanner on F3
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F2") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "F9") { e.preventDefault(); handleCheckout(); }
      if (e.key === "F3") { e.preventDefault(); setScannerOpen(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cart, paymentMethod, cashReceived, processing]);

  useEffect(() => {
    if (!tenantId) return;
    const q = supabase
      .from("pdm_products")
      .select("id, name, sku, barcode, category, price, cost_price, stock_quantity, image_url, is_active")
      .eq("tenant_id", tenantId)
      .eq("is_active", true);
    applyBranchFilter(q)
      .order("name")
      .then(({ data }) => {
        if (data) setProducts(data as Product[]);
      });
  }, [tenantId, activeBranchId]);

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return ["All", ...Array.from(cats).sort()];
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch = p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q));
      const matchCat = selectedCategory === "All" || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, search, selectedCategory]);

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) { toast.error("Not enough stock"); return prev; }
        return prev.map((c) => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      if (product.stock_quantity < 1) { toast.error("Out of stock"); return prev; }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  // Barcode scan handler — find product by barcode or SKU
  const handleBarcodeScan = useCallback((code: string) => {
    const product = products.find(
      (p) => p.barcode === code || p.sku === code
    );
    if (product) {
      addToCart(product);
      toast.success(`Added: ${product.name}`);
    } else {
      toast.error(`No product found for code: ${code}`);
    }
  }, [products, addToCart]);

  // Listen for USB/Bluetooth barcode scanner input
  useBarcodeScanListener(handleBarcodeScan);

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.product.id !== productId) return c;
        const newQty = c.quantity + delta;
        if (newQty > c.product.stock_quantity) { toast.error("Not enough stock"); return c; }
        return { ...c, quantity: newQty };
      }).filter((c) => c.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => setCart((prev) => prev.filter((c) => c.product.id !== productId));

  const subtotal = cart.reduce((s, c) => s + c.product.price * c.quantity, 0);
  const discountAmount = discountType === "percent" ? (subtotal * discount) / 100 : discount;
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const taxAmount = (afterDiscount * taxRate) / 100;
  const total = afterDiscount + taxAmount;
  const change = paymentMethod === "cash" ? Math.max(0, cashReceived - total) : 0;
  const totalItems = cart.reduce((s, c) => s + c.quantity, 0);
  const profit = cart.reduce((s, c) => s + (c.product.price - c.product.cost_price) * c.quantity, 0) - discountAmount;

  // Fetch recent sales
  const fetchRecentSales = useCallback(async () => {
    if (!tenantId) return;
    const q = supabase
      .from("pdm_orders")
      .select("id, order_number, customer_name, total, payment_status, created_at, notes")
      .eq("tenant_id", tenantId);
    const { data } = await applyBranchFilter(q)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setRecentSales(data);
  }, [tenantId, applyBranchFilter, activeBranchId]);

  const holdOrder = () => {
    if (cart.length === 0) return;
    setHoldOrders((prev) => [...prev, { cart, customer: customerName || "Walk-in", time: new Date().toLocaleTimeString() }]);
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    toast.success("Order held");
  };

  const recallOrder = (index: number) => {
    const order = holdOrders[index];
    setCart(order.cart);
    setCustomerName(order.customer);
    setHoldOrders((prev) => prev.filter((_, i) => i !== index));
    setShowHoldList(false);
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || processing) return;
    if (paymentMethod === "cash" && cashReceived < total) { toast.error("Insufficient cash received"); return; }
    setProcessing(true);
    try {
      const orderNumber = `POS-${Date.now().toString(36).toUpperCase()}`;
      const { data: order, error } = await supabase
        .from("pdm_orders")
        .insert({
          tenant_id: tenantId!, created_by: userId!, branch_id: activeBranchId ?? null, order_number: orderNumber,
          customer_name: customerName || "Walk-in Customer", customer_phone: customerPhone || "N/A",
          customer_address: "POS - In Store", customer_email: "", subtotal, discount: discountAmount, delivery_charge: 0, total,
          cod_amount: paymentMethod === "cash" ? total : 0, payment_status: "paid", order_status: "delivered",
          notes: `POS Sale | Payment: ${paymentMethod}${paymentMethod === "cash" ? ` | Received: ${formatPrice(cashReceived)} | Change: ${formatPrice(change)}` : ""}`,
        } as any).select().single();
      if (error) throw error;

      const items = cart.map((c) => ({
        order_id: order.id, tenant_id: tenantId!, branch_id: activeBranchId ?? null, product_id: c.product.id,
        product_name: c.product.name, quantity: c.quantity, unit_price: c.product.price,
        total: c.product.price * c.quantity,
      }));
      await supabase.from("pdm_order_items").insert(items);

      // Deduct stock
      for (const c of cart) {
        await supabase.from("pdm_products").update({ stock_quantity: c.product.stock_quantity - c.quantity }).eq("id", c.product.id);
      }

      setLastOrder({
        orderNumber, items: cart, subtotal, discount: discountAmount, total, paymentMethod,
        cashReceived, change, customerName: customerName || "Walk-in Customer", date: new Date().toLocaleString(), profit,
      });
      setShowReceipt(true);
      setCart([]); setCustomerName(""); setCustomerPhone(""); setDiscount(0); setCashReceived(0);

      // Refresh stock
      const refreshQ = supabase
        .from("pdm_products")
        .select("id, name, sku, barcode, category, price, cost_price, stock_quantity, image_url, is_active")
        .eq("tenant_id", tenantId!).eq("is_active", true);
      const { data: refreshed } = await applyBranchFilter(refreshQ).order("name");
      if (refreshed) setProducts(refreshed as Product[]);
      toast.success("Sale completed!");
    } catch (err: any) {
      toast.error(err.message || "Failed to process sale");
    }
    setProcessing(false);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-3 h-[calc(100vh-5rem)] overflow-hidden animate-fade-in">
      {/* Left: Products */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Receipt className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground leading-tight">Point of Sale</h1>
              <p className="text-[10px] text-muted-foreground">F2: Search · F3: Scan · F9: Checkout</p>
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            {/* POS Type Switcher */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setTypeSwitcherOpen(true)}
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{businessType ? businessType.charAt(0).toUpperCase() + businessType.slice(1) : "Setup"}</span>
            </Button>
            {/* Barcode Scanner */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setScannerOpen(true)}
            >
              <ScanLine className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Scan</span>
            </Button>
            {/* Recent Sales */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => { setShowRecentSales(true); fetchRecentSales(); }}
            >
              <Receipt className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Recent</span>
            </Button>
            {holdOrders.length > 0 && (
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setShowHoldList(true)}>
                <Clock className="h-3.5 w-3.5" />
                Held ({holdOrders.length})
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={holdOrder} disabled={cart.length === 0}>
              <Clock className="h-3.5 w-3.5" />
              Hold
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input ref={searchRef} className="pl-9 h-10" placeholder="Search products by name, SKU, or barcode... (F2)" value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category pills */}
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
            {filtered.map((product) => {
              const inCart = cart.find((c) => c.product.id === product.id);
              return (
                <button key={product.id} onClick={() => addToCart(product)}
                  className={`group relative flex flex-col items-center p-3 rounded-xl border bg-card hover:shadow-md transition-all text-left ${
                    inCart ? "border-primary/50 ring-1 ring-primary/20" : "border-border hover:border-primary/30"
                  }`}
                >
                  {inCart && (
                    <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold z-10">
                      {inCart.quantity}
                    </div>
                  )}
                  <div className="w-full aspect-square rounded-lg bg-muted/50 flex items-center justify-center mb-2 overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover rounded-lg" loading="lazy" />
                    ) : (
                      <Package className="h-8 w-8 text-muted-foreground/40" />
                    )}
                  </div>
                  <p className="text-xs font-semibold text-foreground truncate w-full text-center">{product.name}</p>
                  <div className="flex items-center gap-1 justify-center">
                    {product.sku && <p className="text-[10px] text-muted-foreground truncate">{product.sku}</p>}
                    {product.barcode && (
                      <QrCode className="h-2.5 w-2.5 text-muted-foreground/60" />
                    )}
                  </div>
                  <p className="text-sm font-bold text-primary mt-0.5">{formatPrice(product.price)}</p>
                  <Badge variant={product.stock_quantity < 5 ? (product.stock_quantity === 0 ? "destructive" : "secondary") : "secondary"}
                    className="text-[10px] mt-1"
                  >
                    {product.stock_quantity === 0 ? "Out of Stock" : `Stock: ${product.stock_quantity}`}
                  </Badge>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No products found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Cart & Checkout */}
      <div className="w-full lg:w-[400px] flex flex-col bg-card border border-border rounded-xl overflow-hidden shrink-0">
        {/* Cart header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <span className="font-bold text-sm">Cart</span>
            {totalItems > 0 && <Badge className="text-[10px] h-5">{totalItems} items</Badge>}
          </div>
          {cart.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setCart([])} className="text-xs text-destructive hover:text-destructive h-7 gap-1">
              <Trash2 className="h-3 w-3" /> Clear
            </Button>
          )}
        </div>

        {/* Customer info */}
        <div className="px-4 py-2 border-b border-border space-y-2">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input className="pl-8 h-8 text-xs" placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div className="flex-1">
              <Input className="h-8 text-xs" placeholder="Phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ShoppingCart className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-xs">Tap products to add</p>
              <button
                onClick={() => setScannerOpen(true)}
                className="mt-2 flex items-center gap-1.5 text-[11px] text-primary hover:underline"
              >
                <ScanLine className="h-3.5 w-3.5" />
                or scan barcode (F3)
              </button>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={item.product.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <span className="text-[10px] text-muted-foreground w-4 shrink-0">{idx + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{item.product.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatPrice(item.product.price)} × {item.quantity}
                    {item.product.barcode && <span className="ml-1 opacity-60">· {item.product.barcode}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-0.5">
                  <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQty(item.product.id, -1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-7 text-center text-xs font-bold">{item.quantity}</span>
                  <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQty(item.product.id, 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs font-bold w-16 text-right">{formatPrice(item.product.price * item.quantity)}</p>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeFromCart(item.product.id)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Totals & Checkout */}
        <div className="border-t border-border px-4 py-3 space-y-2 bg-muted/10">
          {/* Discount & Tax */}
          <div className="flex items-center gap-2">
            <Percent className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Input type="number" className="h-7 text-xs flex-1" placeholder="Discount" value={discount || ""} onChange={(e) => setDiscount(+e.target.value)} />
            <Button size="sm" variant={discountType === "flat" ? "default" : "outline"} className="h-7 text-[10px] px-2" onClick={() => setDiscountType("flat")}>Flat</Button>
            <Button size="sm" variant={discountType === "percent" ? "default" : "outline"} className="h-7 text-[10px] px-2" onClick={() => setDiscountType("percent")}>%</Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground font-medium shrink-0">Tax %</span>
            <Input type="number" className="h-7 text-xs w-20" placeholder="0" min={0} max={100} value={taxRate || ""} onChange={(e) => setTaxRate(+e.target.value)} />
            <div className="flex gap-1">
              {[0, 5, 7.5, 10, 15].map((r) => (
                <button key={r} onClick={() => setTaxRate(r)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${taxRate === r ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >{r}%</button>
              ))}
            </div>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal ({totalItems} items)</span><span>{formatPrice(subtotal)}</span></div>
            {discountAmount > 0 && <div className="flex justify-between text-destructive"><span>Discount</span><span>-{formatPrice(discountAmount)}</span></div>}
            {taxAmount > 0 && <div className="flex justify-between text-muted-foreground"><span>Tax ({taxRate}%)</span><span>+{formatPrice(taxAmount)}</span></div>}
            <Separator />
            <div className="flex justify-between text-base font-bold"><span>Total</span><span className="text-primary">{formatPrice(total)}</span></div>
            {profit > 0 && cart.length > 0 && (
              <div className="flex justify-between text-[10px] text-emerald-600"><span>Est. Profit</span><span>+{formatPrice(profit)}</span></div>
            )}
          </div>

          {/* Payment method */}
          <div className="grid grid-cols-3 gap-1.5">
            {([
              { key: "cash" as const, icon: Banknote, label: "Cash" },
              { key: "card" as const, icon: CreditCard, label: "Card" },
              { key: "mobile" as const, icon: Smartphone, label: "Mobile" },
            ]).map((m) => (
              <button key={m.key} onClick={() => setPaymentMethod(m.key)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-colors ${
                  paymentMethod === m.key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                <m.icon className="h-4 w-4" />{m.label}
              </button>
            ))}
          </div>

          {/* Cash received */}
          {paymentMethod === "cash" && (
            <>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">Received:</Label>
                <Input type="number" className="h-8 text-xs" value={cashReceived || ""} onChange={(e) => setCashReceived(+e.target.value)} />
                {cashReceived >= total && total > 0 && (
                  <span className="text-xs text-emerald-600 font-bold whitespace-nowrap">Change: {formatPrice(change)}</span>
                )}
              </div>
              {total > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {[Math.ceil(total), Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500, Math.ceil(total / 1000) * 1000]
                    .filter((v, i, a) => a.indexOf(v) === i && v >= total).slice(0, 4)
                    .map((v) => (
                      <Button key={v} size="sm" variant="outline" className="h-7 text-[10px] px-2" onClick={() => setCashReceived(v)}>{formatPrice(v)}</Button>
                    ))}
                </div>
              )}
            </>
          )}

          <Button className="w-full h-11 text-sm font-bold gap-2" disabled={cart.length === 0 || processing} onClick={handleCheckout}>
            {processing ? (
              <div className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
            ) : (
              <>
                <Receipt className="h-4 w-4" />
                Complete Sale — {formatPrice(total)}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-md print:shadow-none p-0 overflow-hidden rounded-2xl">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 py-5 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-sm tracking-wide">Payment Successful</p>
                  <p className="text-emerald-100 text-xs">{lastOrder?.date}</p>
                </div>
              </div>
              {lastOrder && (
                <p className="text-2xl font-bold tracking-tight">{formatPrice(lastOrder.total)}</p>
              )}
            </div>
          </div>
          {lastOrder && (
            <div className="px-6 py-5 space-y-5" id="pos-receipt">
              {/* Order & Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Receipt No.</p>
                  <p className="text-sm font-mono font-semibold mt-0.5">{lastOrder.orderNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Payment Method</p>
                  <p className="text-sm font-semibold mt-0.5 capitalize">{lastOrder.paymentMethod}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Customer</p>
                  <p className="text-sm font-semibold mt-0.5">{lastOrder.customerName}</p>
                </div>
              </div>

              {/* Barcode on receipt */}
              <div className="flex justify-center py-2">
                <BarcodeDisplay value={lastOrder.orderNumber} width={250} height={50} type="barcode" />
              </div>

              {/* Line Items */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/40 px-4 py-2 flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                  <span>Item</span>
                  <span>Amount</span>
                </div>
                <div className="divide-y divide-border">
                  {lastOrder.items.map((item: CartItem) => (
                    <div key={item.product.id} className="flex justify-between items-center px-4 py-2.5">
                      <div>
                        <p className="text-sm font-medium">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">{formatPrice(item.product.price)} × {item.quantity}</p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{formatPrice(item.product.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-2 px-1">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatPrice(lastOrder.subtotal)}</span>
                </div>
                {lastOrder.discount > 0 && (
                  <div className="flex justify-between text-sm text-destructive">
                    <span>Discount</span>
                    <span className="tabular-nums">−{formatPrice(lastOrder.discount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between items-center pt-1">
                  <span className="text-sm font-bold">Total</span>
                  <span className="text-lg font-bold tabular-nums">{formatPrice(lastOrder.total)}</span>
                </div>
                {lastOrder.paymentMethod === "cash" && (
                  <div className="rounded-lg bg-muted/50 p-3 mt-2 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Cash Received</span>
                      <span className="font-medium tabular-nums">{formatPrice(lastOrder.cashReceived)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Change Due</span>
                      <span className="font-bold text-emerald-600 tabular-nums">{formatPrice(lastOrder.change)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2.5 pt-1">
                <Button variant="outline" className="flex-1 gap-1.5 h-10 rounded-xl" onClick={() => printPosReceipt(lastOrder, formatPrice)}>
                  <Printer className="h-3.5 w-3.5" /> Print Receipt
                </Button>
                <Button className="flex-1 h-10 rounded-xl" onClick={() => setShowReceipt(false)}>New Sale</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hold Orders Dialog */}
      <Dialog open={showHoldList} onOpenChange={setShowHoldList}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Clock className="h-4 w-4" /> Held Orders</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {holdOrders.map((ho, i) => (
              <button key={i} onClick={() => recallOrder(i)}
                className="w-full p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors text-left"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{ho.customer}</span>
                  <span className="text-[10px] text-muted-foreground">{ho.time}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{ho.cart.length} items · {formatPrice(ho.cart.reduce((s, c) => s + c.product.price * c.quantity, 0))}</p>
              </button>
            ))}
            {holdOrders.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No held orders</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Recent Sales Dialog */}
      <Dialog open={showRecentSales} onOpenChange={setShowRecentSales}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /> Recent Sales</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {recentSales.length > 0 ? recentSales.map((sale: any) => (
              <div key={sale.id} className="p-3 rounded-xl border border-border bg-muted/20 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono font-semibold text-foreground">{sale.order_number}</span>
                  <span className="text-sm font-bold text-primary">{formatPrice(sale.total)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{sale.customer_name}</span>
                  <Badge variant="secondary" className="text-[10px]">{sale.payment_status}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">{new Date(sale.created_at).toLocaleString()}</p>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-8">No recent sales found</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner Dialog */}
      <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleBarcodeScan} />

      {/* POS Type Switcher Dialog */}
      <PosTypeSwitcher open={typeSwitcherOpen} onClose={() => setTypeSwitcherOpen(false)} />
    </div>
  );
}
