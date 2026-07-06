
-- Create page_seo table for per-route SEO metadata
CREATE TABLE public.page_seo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_path TEXT NOT NULL UNIQUE,
  page_name TEXT NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT,
  meta_image TEXT,
  og_title TEXT,
  og_description TEXT,
  og_image TEXT,
  twitter_title TEXT,
  twitter_description TEXT,
  twitter_image TEXT,
  canonical_url TEXT,
  robots TEXT DEFAULT 'index, follow',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_seo ENABLE ROW LEVEL SECURITY;

-- Anyone can read SEO data (needed for all pages)
CREATE POLICY "Anyone can read page_seo" ON public.page_seo FOR SELECT USING (true);

-- Only super admins can manage
CREATE POLICY "Super admins can manage page_seo" ON public.page_seo FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Seed default SEO data for all routes
INSERT INTO public.page_seo (route_path, page_name, meta_title) VALUES
  ('/', 'Home', 'Boostio – Simplify Growth Execution'),
  ('/pricing', 'Pricing', 'Pricing'),
  ('/login', 'Login', 'Login'),
  ('/signup', 'Sign Up', 'Sign Up'),
  ('/contact', 'Contact', 'Contact Us'),
  ('/help', 'Help Center', 'Help Center'),
  ('/privacy', 'Privacy Policy', 'Privacy Policy'),
  ('/terms', 'Terms of Service', 'Terms of Service'),
  ('/refund', 'Refund Policy', 'Refund Policy'),
  ('/dashboard', 'Dashboard', 'Dashboard'),
  ('/hrms/employees', 'Employees', 'Employees'),
  ('/hrms/attendance', 'Attendance', 'Attendance'),
  ('/hrms/leave', 'Leave Management', 'Leave Management'),
  ('/hrms/payroll', 'Payroll', 'Payroll'),
  ('/hrms/recruitment', 'Recruitment', 'Recruitment'),
  ('/hrms/performance', 'Performance', 'Performance'),
  ('/crm', 'CRM', 'CRM'),
  ('/marketing/campaigns', 'Campaigns', 'Marketing Campaigns'),
  ('/marketing/templates', 'Email Templates', 'Email Templates'),
  ('/marketing/analytics', 'Marketing Analytics', 'Marketing Analytics'),
  ('/workflows', 'Workflows', 'Workflows'),
  ('/accounting/invoices', 'Invoices', 'Invoices'),
  ('/accounting/expenses', 'Expenses', 'Expenses'),
  ('/accounting/payments', 'Payments', 'Payments'),
  ('/accounting/tax', 'Tax Settings', 'Tax Settings'),
  ('/accounting/tax-reports', 'Tax Reports', 'Tax Reports'),
  ('/helpdesk', 'Helpdesk', 'Helpdesk'),
  ('/projects', 'Projects', 'Projects'),
  ('/documents', 'Documents', 'Documents'),
  ('/reports', 'Reports', 'Reports'),
  ('/notifications', 'Notifications', 'Notifications'),
  ('/settings', 'Settings', 'Settings'),
  ('/subscription', 'My Subscription', 'My Subscription'),
  ('/wallet', 'Wallet', 'Wallet'),
  ('/features/hrms', 'HRMS Feature', 'HRMS – Human Resource Management'),
  ('/features/crm', 'CRM Feature', 'CRM – Customer Relationship Management'),
  ('/features/marketing', 'Marketing Feature', 'Marketing Automation'),
  ('/features/workflows', 'Workflows Feature', 'Workflow Automation'),
  ('/features/accounting', 'Accounting Feature', 'Accounting & Finance'),
  ('/features/helpdesk', 'Helpdesk Feature', 'Helpdesk & Support'),
  ('/features/projects', 'Projects Feature', 'Project Management'),
  ('/features/documents', 'Documents Feature', 'Document Management'),
  ('/features/reports', 'Reports Feature', 'Reports & Analytics'),
  ('/superadmin/dashboard', 'Admin Dashboard', 'Admin Dashboard'),
  ('/superadmin/seo', 'SEO Management', 'SEO Management'),
  ('/company-admin/dashboard', 'Company Dashboard', 'Company Dashboard'),
  ('/portal/employee', 'Employee Portal', 'Employee Portal'),
  ('/portal/customer', 'Customer Portal', 'Customer Portal'),
  ('/product-hub/dashboard', 'Product Hub', 'Product Hub'),
  ('/product-hub/products', 'Products', 'Products'),
  ('/product-hub/orders', 'Orders', 'Orders');
