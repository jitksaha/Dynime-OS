import { useState, useEffect, useCallback } from "react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, ExpressCheckoutElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { ShieldCheck, CheckCircle2, Receipt, X } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";

interface StripeInAppCheckoutProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (paymentIntentId?: string) => void;
  paymentDetails: {
    purpose: "subscription" | "addon" | "wallet_topup";
    plan_id?: string;
    billing_cycle?: string;
    addon_id?: string;
    payment_type?: string;
    amount?: number;
    wallet_id?: string;
    tenant_id?: string;
    saved_method_id?: string;
    plan_name?: string;
    description?: string;
    tax_amount?: number;
  };
}

/* ── Checkout Form (right panel) ── */
function CheckoutForm({
  onSuccess,
  amount,
  currency,
  paymentIntentId,
}: {
  onSuccess: (paymentIntentId?: string) => void;
  onClose: () => void;
  amount: number;
  currency: string;
  paymentIntentId: string;
  taxAmount?: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [ready, setReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/subscription?payment=success",
      },
      redirect: "if_required",
    });

    if (error) {
      toast.error(error.message || "Payment failed");
      setProcessing(false);
    } else {
      toast.success("Payment successful!");
      onSuccess(paymentIntentId);
    }
  };

  const sym = (() => { try { return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(0).replace(/[\d.,\s]/g, ""); } catch { return "$"; } })();

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      {/* Payment breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-5">
        <span>Your details</span>
        <span>›</span>
        <span className="text-primary font-semibold">Payment</span>
      </div>

      {/* Express Checkout (Google Pay, Apple Pay, Link) */}
      <div className="mb-4">
        <ExpressCheckoutElement
          onConfirm={async (event) => {
            if (!stripe || !elements) return;
            const { error } = await stripe.confirmPayment({
              elements,
              confirmParams: {
                return_url: window.location.origin + "/subscription?payment=success",
              },
              redirect: "if_required",
            });
            if (error) {
              toast.error(error.message || "Payment failed");
            } else {
              toast.success("Payment successful!");
              onSuccess(paymentIntentId);
            }
          }}
          options={{
            layout: { maxColumns: 2, maxRows: 1 },
          }}
        />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">Or pay with card</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Stripe Elements */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <PaymentElement
          onReady={() => setReady(true)}
          options={{ layout: "tabs" }}
        />

        {!ready && (
          <div className="flex justify-center py-8">
            <Spinner size="md" variant="primary" />
          </div>
        )}
      </div>

      {/* Security badge */}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-4">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
        <span>Secured by Stripe. Your payment info is encrypted end-to-end.</span>
      </div>

      {/* Pay button */}
      <button
        type="submit"
        disabled={!stripe || !elements || processing || !ready}
        className="w-full mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {processing && <Spinner size="xs" variant="white" />}
        {processing ? "Processing..." : `Pay ${sym}${amount.toLocaleString()}`}
      </button>
    </form>
  );
}

/* ── Order Summary (left panel) ── */
function OrderSummary({
  amount,
  currency,
  purpose,
  planName,
  description,
  taxAmount,
}: {
  amount: number;
  currency: string;
  purpose: string;
  planName?: string;
  description?: string;
  taxAmount: number;
}) {
  const sym = (() => { try { return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(0).replace(/[\d.,\s]/g, ""); } catch { return "$"; } })();
  const subtotal = amount - taxAmount;

  const purposeLabel =
    purpose === "subscription"
      ? "Subscription"
      : purpose === "addon"
        ? "Add-on"
        : "Wallet Top-up";

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
        Order Summary
      </h3>

      {/* Total */}
      <div className="mb-6">
        <span className="text-3xl font-bold text-foreground">{sym}{amount.toLocaleString()}</span>
        {taxAmount > 0 && (
          <span className="text-xs text-muted-foreground ml-2">inc. Tax</span>
        )}
      </div>

      {/* Item */}
      <div className="border-b border-border pb-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Receipt className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {planName || purposeLabel}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">Qty: 1</p>
      </div>

      {/* Line items */}
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium text-foreground">{sym}{subtotal.toLocaleString()}</span>
        </div>
        {taxAmount > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax / VAT</span>
            <span className="font-medium text-foreground">{sym}{taxAmount.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between pt-3 border-t border-border">
          <span className="font-semibold text-foreground">Due today</span>
          <span className="font-bold text-foreground">{sym}{amount.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Stripe cache ── */
const stripeCache = new Map<string, Promise<Stripe | null>>();
function getStripePromise(pk: string) {
  if (!stripeCache.has(pk)) stripeCache.set(pk, loadStripe(pk));
  return stripeCache.get(pk)!;
}

/* ── Main Dialog ── */
export default function StripeInAppCheckout({
  open,
  onClose,
  onSuccess,
  paymentDetails,
}: StripeInAppCheckoutProps) {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState("");
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState("usd");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offSessionSuccess, setOffSessionSuccess] = useState(false);
  const [_requiresAction, setRequiresAction] = useState(false);

  const taxAmount = paymentDetails.tax_amount || 0;

  const createIntent = useCallback(async () => {
    setLoading(true);
    setError(null);
    setClientSecret(null);
    setOffSessionSuccess(false);
    setRequiresAction(false);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "stripe-create-intent",
        { body: paymentDetails }
      );

      if (fnError) { setError("Failed to initialize payment. Please try again."); return; }
      if (data?.error) { setError(data.error); return; }

      if (data?.off_session_success) {
        setPaymentIntentId(data.payment_intent_id || "");
        setOffSessionSuccess(true);
        setLoading(false);
        setTimeout(() => { onClose(); onSuccess(data.payment_intent_id); }, 1500);
        return;
      }

      setClientSecret(data.client_secret);
      setPaymentIntentId(data.payment_intent_id || "");
      setAmount(data.amount);
      setCurrency(data.currency);
      setStripePromise(getStripePromise(data.publishable_key));
      if (data.requires_action) setRequiresAction(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [paymentDetails, onClose, onSuccess]);

  useEffect(() => {
    if (open) createIntent();
    else {
      setClientSecret(null);
      setPaymentIntentId("");
      setError(null);
      setOffSessionSuccess(false);
      setRequiresAction(false);
    }
  }, [open, createIntent]);

  const handleSuccess = (piId?: string) => { onClose(); onSuccess(piId || paymentIntentId); };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden gap-0 [&>button]:hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 h-7 w-7 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="flex flex-col md:flex-row min-h-[420px]">
          {/* Left — Order Summary */}
          <div className="md:w-[42%] bg-muted/30 border-b md:border-b-0 md:border-r border-border p-6 md:p-8">
            <OrderSummary
              amount={amount || paymentDetails.amount || 0}
              currency={currency}
              purpose={paymentDetails.purpose}
              planName={paymentDetails.plan_name}
              description={paymentDetails.description}
              taxAmount={taxAmount}
            />
          </div>

          {/* Right — Payment */}
          <div className="flex-1 p-6 md:p-8">
            {/* Off-session success */}
            {offSessionSuccess && (
              <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-7 w-7 text-primary" />
                </div>
                <p className="text-base font-semibold text-foreground">Payment Successful</p>
                <p className="text-sm text-muted-foreground">Your saved card has been charged.</p>
              </div>
            )}

            {/* Loading */}
            {loading && !offSessionSuccess && (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <Spinner size="xl" variant="primary" />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    {paymentDetails.saved_method_id ? "Charging your saved card..." : "Preparing secure checkout..."}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">This usually takes a few seconds</p>
                </div>
              </div>
            )}

            {/* Error */}
            {error && !offSessionSuccess && (
              <div className="flex flex-col items-center justify-center h-full">
                <p className="text-sm text-destructive mb-3">{error}</p>
                <button onClick={createIntent} className="text-sm text-primary hover:underline">Try again</button>
              </div>
            )}

            {/* Stripe form */}
            {clientSecret && stripePromise && !loading && !error && !offSessionSuccess && (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: "stripe",
                    variables: {
                      colorPrimary: "hsl(var(--primary))",
                      borderRadius: "8px",
                    },
                  },
                }}
              >
                <CheckoutForm
                  onSuccess={handleSuccess}
                  onClose={onClose}
                  amount={amount}
                  currency={currency}
                  paymentIntentId={paymentIntentId}
                  taxAmount={taxAmount}
                />
              </Elements>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
