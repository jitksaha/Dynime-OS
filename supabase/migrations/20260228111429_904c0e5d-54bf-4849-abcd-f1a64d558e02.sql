
-- Table to store saved/tokenized payment methods per user
CREATE TABLE public.saved_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id),
  gateway_key text NOT NULL,
  display_name text NOT NULL,
  method_label text NOT NULL, -- e.g. "bKash ****1234", "Visa ****5678"
  token text, -- tokenized reference from gateway
  agreement_id text, -- for bKash/recurring agreements
  card_brand text, -- visa, mastercard, etc.
  card_last4 text,
  phone_last4 text, -- for mobile wallets like bKash
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_payment_methods ENABLE ROW LEVEL SECURITY;

-- Users can only see their own saved methods
CREATE POLICY "Users can view own saved methods"
  ON public.saved_payment_methods FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved methods"
  ON public.saved_payment_methods FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved methods"
  ON public.saved_payment_methods FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved methods"
  ON public.saved_payment_methods FOR DELETE
  USING (auth.uid() = user_id);

-- Ensure only one default per user
CREATE UNIQUE INDEX idx_saved_payment_default 
  ON public.saved_payment_methods (user_id) 
  WHERE is_default = true AND is_active = true;

-- Index for quick lookups
CREATE INDEX idx_saved_payment_user ON public.saved_payment_methods(user_id, is_active);

-- Auto-update timestamps
CREATE TRIGGER update_saved_payment_methods_updated_at
  BEFORE UPDATE ON public.saved_payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table for recurring payment schedules
CREATE TABLE public.recurring_payment_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id),
  saved_method_id uuid REFERENCES public.saved_payment_methods(id) ON DELETE SET NULL,
  schedule_type text NOT NULL DEFAULT 'subscription', -- subscription, addon, wallet_topup
  reference_id text, -- subscription_id or addon module name
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BDT',
  billing_cycle text NOT NULL DEFAULT 'monthly', -- monthly, quarterly, yearly
  next_charge_date date NOT NULL,
  last_charged_at timestamptz,
  retry_count int NOT NULL DEFAULT 0,
  max_retries int NOT NULL DEFAULT 3,
  status text NOT NULL DEFAULT 'active', -- active, paused, suspended, cancelled
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recurring_payment_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own schedules"
  ON public.recurring_payment_schedules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own schedules"
  ON public.recurring_payment_schedules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own schedules"
  ON public.recurring_payment_schedules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_recurring_schedule_user ON public.recurring_payment_schedules(user_id, status);
CREATE INDEX idx_recurring_next_charge ON public.recurring_payment_schedules(next_charge_date, status);

CREATE TRIGGER update_recurring_schedules_updated_at
  BEFORE UPDATE ON public.recurring_payment_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Payment attempt log for recurring charges
CREATE TABLE public.recurring_payment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES public.recurring_payment_schedules(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  tenant_id uuid,
  gateway_key text NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, success, failed
  transaction_id text,
  failure_reason text,
  gateway_response jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recurring_payment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment logs"
  ON public.recurring_payment_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_recurring_logs_schedule ON public.recurring_payment_logs(schedule_id, created_at DESC);
