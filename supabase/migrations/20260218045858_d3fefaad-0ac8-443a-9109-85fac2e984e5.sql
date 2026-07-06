
-- KYC verifications table
CREATE TABLE public.kyc_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  nationality TEXT,
  document_type TEXT NOT NULL DEFAULT 'nid' CHECK (document_type IN ('nid', 'passport', 'driving_license', 'birth_certificate')),
  document_number TEXT NOT NULL,
  document_front_url TEXT,
  document_back_url TEXT,
  selfie_url TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  phone_number TEXT,
  rejection_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own KYC
CREATE POLICY "Users can view own KYC"
ON public.kyc_verifications FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own KYC
CREATE POLICY "Users can submit KYC"
ON public.kyc_verifications FOR INSERT
WITH CHECK (user_id = auth.uid() AND tenant_id = get_user_tenant_id(auth.uid()));

-- Users can update their own pending KYC
CREATE POLICY "Users can update pending KYC"
ON public.kyc_verifications FOR UPDATE
USING (user_id = auth.uid() AND status IN ('pending', 'rejected'));

-- Super admins full access
CREATE POLICY "Super admins full access kyc"
ON public.kyc_verifications FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Company admins can view their tenant KYC
CREATE POLICY "Company admins view tenant KYC"
ON public.kyc_verifications FOR SELECT
USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'company_admin'::app_role));

-- Company admins can update (approve/reject) tenant KYC
CREATE POLICY "Company admins manage tenant KYC"
ON public.kyc_verifications FOR UPDATE
USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'company_admin'::app_role));

-- Create storage bucket for KYC documents
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false);

-- Storage policies for KYC documents
CREATE POLICY "Users can upload own KYC docs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own KYC docs"
ON storage.objects FOR SELECT
USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all KYC docs"
ON storage.objects FOR SELECT
USING (bucket_id = 'kyc-documents' AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'company_admin'::app_role)));

-- Trigger for updated_at
CREATE TRIGGER update_kyc_verifications_updated_at
BEFORE UPDATE ON public.kyc_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Only allow one active KYC per user (not rejected)
CREATE UNIQUE INDEX idx_kyc_one_active_per_user 
ON public.kyc_verifications (user_id) 
WHERE status != 'rejected';
