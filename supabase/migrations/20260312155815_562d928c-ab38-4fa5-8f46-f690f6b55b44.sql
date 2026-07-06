
-- Add exchange rate tracking to invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS exchange_rate numeric DEFAULT 1;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS base_currency text DEFAULT 'USD';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS base_amount numeric DEFAULT 0;

-- Add grace period and proration fields to subscriptions
ALTER TABLE public.tenant_subscriptions ADD COLUMN IF NOT EXISTS previous_plan_id uuid REFERENCES public.subscription_plans(id);
ALTER TABLE public.tenant_subscriptions ADD COLUMN IF NOT EXISTS proration_credit numeric DEFAULT 0;
ALTER TABLE public.tenant_subscriptions ADD COLUMN IF NOT EXISTS upgrade_type text DEFAULT 'new';

-- Add grace period to recurring schedules
ALTER TABLE public.recurring_payment_schedules ADD COLUMN IF NOT EXISTS grace_period_ends_at timestamptz;
ALTER TABLE public.recurring_payment_schedules ADD COLUMN IF NOT EXISTS grace_notified boolean DEFAULT false;

-- Payment retry log table for detailed retry tracking
CREATE TABLE IF NOT EXISTS public.payment_retry_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES public.recurring_payment_schedules(id) ON DELETE CASCADE NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  attempt_number int NOT NULL DEFAULT 1,
  gateway_key text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'failed',
  error_message text,
  next_retry_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_retry_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view retry logs" ON public.payment_retry_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Exchange rate cache table
CREATE TABLE IF NOT EXISTS public.exchange_rate_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency text NOT NULL DEFAULT 'USD',
  rates jsonb NOT NULL DEFAULT '{}',
  source text NOT NULL DEFAULT 'api',
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '6 hours')
);

ALTER TABLE public.exchange_rate_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read exchange rates" ON public.exchange_rate_cache
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role inserts rates" ON public.exchange_rate_cache
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
