
-- Create storage bucket for resumes
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false);

-- Allow anyone to upload resumes (public job applicants are unauthenticated)
CREATE POLICY "Anyone can upload resumes" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'resumes');

-- Authenticated tenant members can view resumes
CREATE POLICY "Tenant members can view resumes" ON storage.objects FOR SELECT USING (
  bucket_id = 'resumes' AND auth.uid() IS NOT NULL
);

-- Update get_public_job to include tenant slug
CREATE OR REPLACE FUNCTION public.get_public_job(job_id uuid)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT row_to_json(t) FROM (
    SELECT jp.id, jp.title, jp.department, jp.location, jp.employment_type, 
           jp.description, jp.status, jp.posted_date, te.name as company_name,
           te.slug as company_slug, te.logo_url as company_logo
    FROM public.job_postings jp
    JOIN public.tenants te ON te.id = jp.tenant_id
    WHERE jp.id = job_id AND jp.status = 'Open'
  ) t
$$;

-- Create function to list all open jobs for a company by slug
CREATE OR REPLACE FUNCTION public.get_public_jobs_by_slug(company_slug text)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(json_agg(t), '[]'::json) FROM (
    SELECT jp.id, jp.title, jp.department, jp.location, jp.employment_type, 
           jp.description, jp.status, jp.posted_date, jp.applicants,
           te.name as company_name, te.slug as company_slug, te.logo_url as company_logo
    FROM public.job_postings jp
    JOIN public.tenants te ON te.id = jp.tenant_id
    WHERE te.slug = company_slug AND jp.status = 'Open'
    ORDER BY jp.posted_date DESC
  ) t
$$;

-- Update submit_job_application to accept resume_url
CREATE OR REPLACE FUNCTION public.submit_job_application(
  _job_id uuid, _name text, _email text, 
  _phone text DEFAULT NULL, _cover_letter text DEFAULT NULL,
  _resume_url text DEFAULT NULL
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
  SELECT tenant_id, status INTO _tenant_id, _job_status
  FROM public.job_postings WHERE id = _job_id;
  
  IF _tenant_id IS NULL THEN
    RAISE EXCEPTION 'Job not found';
  END IF;
  
  IF _job_status != 'Open' THEN
    RAISE EXCEPTION 'This job is no longer accepting applications';
  END IF;

  INSERT INTO public.job_applications (job_id, tenant_id, applicant_name, applicant_email, applicant_phone, cover_letter, resume_url)
  VALUES (_job_id, _tenant_id, _name, _email, _phone, _cover_letter, _resume_url)
  RETURNING id INTO _app_id;

  UPDATE public.job_postings SET applicants = applicants + 1 WHERE id = _job_id;

  RETURN _app_id;
END;
$$;

-- Add salary_range and requirements columns to job_postings
ALTER TABLE public.job_postings ADD COLUMN IF NOT EXISTS salary_range text;
ALTER TABLE public.job_postings ADD COLUMN IF NOT EXISTS requirements text;
ALTER TABLE public.job_postings ADD COLUMN IF NOT EXISTS benefits text;
ALTER TABLE public.job_postings ADD COLUMN IF NOT EXISTS experience_level text DEFAULT 'Mid-level';
