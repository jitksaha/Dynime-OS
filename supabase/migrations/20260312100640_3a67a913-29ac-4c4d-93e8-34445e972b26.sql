-- Gateway health tracking table for monitoring payment gateway status
CREATE TABLE IF NOT EXISTS public.gateway_health_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_key text NOT NULL,
  event_type text NOT NULL DEFAULT 'payment_attempt',
  status text NOT NULL DEFAULT 'success',
  response_time_ms integer,
  error_message text,
  transaction_id text,
  amount numeric,
  currency text,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_gateway_health_logs_gateway_key ON public.gateway_health_logs(gateway_key, created_at DESC);
CREATE INDEX idx_gateway_health_logs_created_at ON public.gateway_health_logs(created_at DESC);

ALTER TABLE public.gateway_health_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can read gateway health logs"
  ON public.gateway_health_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Service role can insert gateway health logs"
  ON public.gateway_health_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Payment rate lock table for locking exchange rates at checkout
CREATE TABLE IF NOT EXISTS public.checkout_rate_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  base_currency text NOT NULL DEFAULT 'USD',
  target_currency text NOT NULL,
  locked_rate numeric NOT NULL,
  locked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  used boolean NOT NULL DEFAULT false,
  transaction_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_checkout_rate_locks_user ON public.checkout_rate_locks(user_id, expires_at DESC);

ALTER TABLE public.checkout_rate_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own rate locks"
  ON public.checkout_rate_locks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own rate locks"
  ON public.checkout_rate_locks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own rate locks"
  ON public.checkout_rate_locks FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());