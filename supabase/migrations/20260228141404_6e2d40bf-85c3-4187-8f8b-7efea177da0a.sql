
-- Add KYB verification fields to tenants table
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS kyb_status text NOT NULL DEFAULT 'not_applied';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS kyb_applied_at timestamp with time zone;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS kyb_verified_at timestamp with time zone;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS kyb_rejection_reason text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS kyb_documents jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS kyb_business_name text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS kyb_registration_number text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS kyb_business_type text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS kyb_business_address text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS kyb_reviewed_by text;

-- Add comment for kyb_status valid values
COMMENT ON COLUMN public.tenants.kyb_status IS 'Valid values: not_applied, pending, under_review, approved, rejected';
