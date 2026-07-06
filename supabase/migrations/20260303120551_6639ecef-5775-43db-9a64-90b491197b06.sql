
-- Partner applications table for public "Become a Partner" form
CREATE TABLE public.partner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  website text,
  country text,
  category text DEFAULT 'technology',
  partner_type text DEFAULT 'technology',
  description text,
  why_partner text,
  status text DEFAULT 'pending' NOT NULL,
  admin_notes text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Allow anonymous inserts for public form
ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit partner application"
  ON public.partner_applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Super admins can manage partner applications"
  ON public.partner_applications FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Add services column to partners table
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS services text[] DEFAULT '{}';
