
-- Blog posts table with comprehensive SEO fields
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL DEFAULT '',
  featured_image TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  tags TEXT[] DEFAULT '{}',
  author_name TEXT NOT NULL DEFAULT 'Admin',
  author_avatar TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  reading_time INT DEFAULT 0,
  views_count INT DEFAULT 0,
  
  -- SEO fields
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  og_title TEXT,
  og_description TEXT,
  og_image TEXT,
  canonical_url TEXT,
  robots TEXT DEFAULT 'index, follow',
  schema_markup JSONB,
  
  -- AI SEO
  ai_seo_score INT,
  ai_seo_suggestions JSONB,
  
  created_by TEXT,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Blog categories table
CREATE TABLE public.blog_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  seo_title TEXT,
  seo_description TEXT,
  post_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

-- Blog posts: anyone can read published posts
CREATE POLICY "Published blog posts are public" ON public.blog_posts
  FOR SELECT USING (status = 'published');

-- Super admins can manage all posts
CREATE POLICY "Super admins manage blog posts" ON public.blog_posts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- Categories: public read
CREATE POLICY "Blog categories are public" ON public.blog_categories
  FOR SELECT USING (true);

CREATE POLICY "Super admins manage categories" ON public.blog_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- Indexes for performance
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX idx_blog_posts_category ON public.blog_posts(category);
CREATE INDEX idx_blog_posts_published_at ON public.blog_posts(published_at DESC);
CREATE INDEX idx_blog_categories_slug ON public.blog_categories(slug);

-- Trigger for updated_at
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed some default categories
INSERT INTO public.blog_categories (name, slug, description) VALUES
  ('Technology', 'technology', 'Latest tech trends and insights'),
  ('Business', 'business', 'Business strategies and tips'),
  ('Product Updates', 'product-updates', 'New features and improvements'),
  ('Tutorials', 'tutorials', 'How-to guides and walkthroughs'),
  ('Industry News', 'industry-news', 'Latest industry developments'),
  ('Case Studies', 'case-studies', 'Real-world success stories');
