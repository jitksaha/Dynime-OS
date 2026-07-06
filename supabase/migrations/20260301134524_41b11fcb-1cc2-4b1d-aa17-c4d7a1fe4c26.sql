
-- Table to store dynamic sidebar menu configurations per portal
CREATE TABLE public.sidebar_menu_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_type TEXT NOT NULL UNIQUE, -- 'main_app', 'company_admin', 'customer_portal', 'employee_portal'
  menu_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.sidebar_menu_configs ENABLE ROW LEVEL SECURITY;

-- Everyone can read menu configs (needed for all users to render sidebars)
CREATE POLICY "Anyone authenticated can read menu configs"
ON public.sidebar_menu_configs FOR SELECT
TO authenticated
USING (true);

-- Only super admins can modify
CREATE POLICY "Super admins can insert menu configs"
ON public.sidebar_menu_configs FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update menu configs"
ON public.sidebar_menu_configs FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete menu configs"
ON public.sidebar_menu_configs FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Seed default rows for each portal type
INSERT INTO public.sidebar_menu_configs (portal_type, menu_items) VALUES
('main_app', '[]'::jsonb),
('company_admin', '[]'::jsonb),
('customer_portal', '[]'::jsonb),
('employee_portal', '[]'::jsonb);
