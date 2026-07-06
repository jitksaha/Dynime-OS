
-- Add client contact, sharing, and notes fields to invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS client_email text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS client_phone text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS client_address text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS share_token text UNIQUE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS sent_via text; -- email, sms, link, null
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS sent_at timestamptz;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_terms text DEFAULT 'net_30';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS discount_type text; -- percentage, flat
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS discount_value numeric(10,2) DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS discount_amount numeric(14,2) DEFAULT 0;

-- Index for public share link lookups
CREATE INDEX IF NOT EXISTS idx_invoices_share_token ON public.invoices(share_token) WHERE share_token IS NOT NULL;
