
-- Employee verification requests table
CREATE TABLE public.employee_verification_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  verification_type TEXT NOT NULL DEFAULT 'identity', -- identity, address, kyb
  status TEXT NOT NULL DEFAULT 'pending', -- pending, submitted, approved, rejected
  requested_by UUID NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  document_urls JSONB DEFAULT '[]'::jsonb,
  document_type TEXT, -- nid, passport, driving_license, utility_bill, etc.
  document_number TEXT,
  address_data JSONB, -- for address verification
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_verification_requests ENABLE ROW LEVEL SECURITY;

-- Company users can view their tenant's verification requests
CREATE POLICY "Tenant users can view verification requests"
ON public.employee_verification_requests FOR SELECT
USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Company admins can insert verification requests
CREATE POLICY "Company admins can create verification requests"
ON public.employee_verification_requests FOR INSERT
WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Company admins and the employee themselves can update
CREATE POLICY "Tenant users can update verification requests"
ON public.employee_verification_requests FOR UPDATE
USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Company admins can delete
CREATE POLICY "Tenant users can delete verification requests"
ON public.employee_verification_requests FOR DELETE
USING (tenant_id = public.get_user_tenant_id(auth.uid()));
