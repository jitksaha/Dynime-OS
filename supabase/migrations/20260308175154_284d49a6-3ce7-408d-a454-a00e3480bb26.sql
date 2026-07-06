
-- Abandoned Carts table
CREATE TABLE public.abandoned_carts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  cart_type TEXT NOT NULL DEFAULT 'subscription',
  item_name TEXT NOT NULL,
  item_description TEXT,
  plan_id TEXT,
  billing_cycle TEXT,
  addon_id TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  checkout_url TEXT,
  status TEXT NOT NULL DEFAULT 'abandoned',
  recovery_email_sent BOOLEAN NOT NULL DEFAULT false,
  recovery_email_sent_at TIMESTAMPTZ,
  recovery_offer_id UUID,
  recovered_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recovery offers table
CREATE TABLE public.cart_recovery_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC NOT NULL DEFAULT 10,
  max_discount_amount NUMERIC,
  valid_hours INTEGER NOT NULL DEFAULT 48,
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_apply BOOLEAN NOT NULL DEFAULT false,
  usage_count INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recovery notification logs
CREATE TABLE public.cart_recovery_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  abandoned_cart_id UUID REFERENCES public.abandoned_carts(id) ON DELETE CASCADE NOT NULL,
  offer_id UUID REFERENCES public.cart_recovery_offers(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_recovery_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_recovery_logs ENABLE ROW LEVEL SECURITY;

-- Super admin policies for abandoned_carts
CREATE POLICY "Super admins can view all abandoned carts"
ON public.abandoned_carts FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update abandoned carts"
ON public.abandoned_carts FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can insert their own abandoned carts"
ON public.abandoned_carts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own abandoned carts"
ON public.abandoned_carts FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Super admin policies for cart_recovery_offers
CREATE POLICY "Super admins manage recovery offers"
ON public.cart_recovery_offers FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Anyone can read active recovery offers"
ON public.cart_recovery_offers FOR SELECT
TO authenticated
USING (is_active = true);

-- Super admin policies for cart_recovery_logs
CREATE POLICY "Super admins manage recovery logs"
ON public.cart_recovery_logs FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Indexes
CREATE INDEX idx_abandoned_carts_user ON public.abandoned_carts(user_id);
CREATE INDEX idx_abandoned_carts_status ON public.abandoned_carts(status);
CREATE INDEX idx_abandoned_carts_created ON public.abandoned_carts(created_at DESC);
CREATE INDEX idx_recovery_logs_cart ON public.cart_recovery_logs(abandoned_cart_id);
