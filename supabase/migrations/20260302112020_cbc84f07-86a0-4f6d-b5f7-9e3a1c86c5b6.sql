
-- Create table for custom code snippets
CREATE TABLE public.custom_code_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('css', 'js')),
  name TEXT NOT NULL,
  code TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  scope TEXT NOT NULL DEFAULT 'global',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_code_snippets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage custom code"
ON public.custom_code_snippets FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Authenticated users can read active snippets"
ON public.custom_code_snippets FOR SELECT
TO authenticated
USING (is_active = true);

CREATE TRIGGER update_custom_code_snippets_updated_at
BEFORE UPDATE ON public.custom_code_snippets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
