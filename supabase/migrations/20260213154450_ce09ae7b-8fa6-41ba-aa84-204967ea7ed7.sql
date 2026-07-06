
-- Create job_applications table for public job applications
CREATE TABLE public.job_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  applicant_name text NOT NULL,
  applicant_email text NOT NULL,
  applicant_phone text,
  cover_letter text,
  resume_url text,
  status text NOT NULL DEFAULT 'New',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public application)
CREATE POLICY "Anyone can submit applications"
ON public.job_applications
FOR INSERT
WITH CHECK (true);

-- Tenant members can view applications for their jobs
CREATE POLICY "Tenant members can view applications"
ON public.job_applications
FOR SELECT
USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Tenant members can update application status
CREATE POLICY "Tenant members can update applications"
ON public.job_applications
FOR UPDATE
USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Tenant members can delete applications
CREATE POLICY "Tenant members can delete applications"
ON public.job_applications
FOR DELETE
USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Create a public function to get job details without auth
CREATE OR REPLACE FUNCTION public.get_public_job(job_id uuid)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT row_to_json(t) FROM (
    SELECT jp.id, jp.title, jp.department, jp.location, jp.employment_type, 
           jp.description, jp.status, jp.posted_date, te.name as company_name
    FROM public.job_postings jp
    JOIN public.tenants te ON te.id = jp.tenant_id
    WHERE jp.id = job_id AND jp.status = 'Open'
  ) t
$$;

-- Create function to submit application without auth
CREATE OR REPLACE FUNCTION public.submit_job_application(
  _job_id uuid,
  _name text,
  _email text,
  _phone text DEFAULT NULL,
  _cover_letter text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id uuid;
  _app_id uuid;
  _job_status text;
BEGIN
  -- Get tenant_id and status from job posting
  SELECT tenant_id, status INTO _tenant_id, _job_status
  FROM public.job_postings WHERE id = _job_id;
  
  IF _tenant_id IS NULL THEN
    RAISE EXCEPTION 'Job not found';
  END IF;
  
  IF _job_status != 'Open' THEN
    RAISE EXCEPTION 'This job is no longer accepting applications';
  END IF;

  INSERT INTO public.job_applications (job_id, tenant_id, applicant_name, applicant_email, applicant_phone, cover_letter)
  VALUES (_job_id, _tenant_id, _name, _email, _phone, _cover_letter)
  RETURNING id INTO _app_id;

  -- Increment applicants count
  UPDATE public.job_postings SET applicants = applicants + 1 WHERE id = _job_id;

  RETURN _app_id;
END;
$$;

-- Enable realtime for job_applications
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_applications;
