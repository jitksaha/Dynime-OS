
-- Table for managed public pages
CREATE TABLE public.managed_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft',
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  seo_title TEXT,
  seo_description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.managed_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage pages" ON public.managed_pages
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Anyone can view published pages" ON public.managed_pages
  FOR SELECT USING (status = 'published');

-- Table for site-wide settings (header, footer, menu)
CREATE TABLE public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage site settings" ON public.site_settings
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Anyone can read site settings" ON public.site_settings
  FOR SELECT USING (true);

-- Seed default settings
INSERT INTO public.site_settings (key, value) VALUES
  ('header', '{"logo_text": "Business360", "show_logo": true, "nav_items": [{"label": "Services", "href": "#services"}, {"label": "Pricing", "href": "/pricing"}, {"label": "Testimonials", "href": "#testimonials"}], "cta_text": "Get Started Free", "cta_link": "/signup"}'::jsonb),
  ('footer', '{"company_name": "Business360", "tagline": "All-in-one business management platform for modern teams.", "columns": [{"title": "Product", "links": [{"label": "Features", "href": "#services"}, {"label": "Pricing", "href": "#pricing"}, {"label": "Sign In", "href": "/login"}]}, {"title": "Company", "links": [{"label": "About", "href": "#"}, {"label": "Blog", "href": "#"}, {"label": "Careers", "href": "#"}]}, {"title": "Support", "links": [{"label": "Help Center", "href": "#"}, {"label": "Contact", "href": "#"}, {"label": "Privacy Policy", "href": "#"}]}], "copyright": "© 2026 Business360. All rights reserved."}'::jsonb),
  ('menu', '{"items": [{"label": "Services", "href": "#services", "visible": true}, {"label": "Pricing", "href": "/pricing", "visible": true}, {"label": "Testimonials", "href": "#testimonials", "visible": true}]}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Trigger for updated_at
CREATE TRIGGER update_managed_pages_updated_at
  BEFORE UPDATE ON public.managed_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
