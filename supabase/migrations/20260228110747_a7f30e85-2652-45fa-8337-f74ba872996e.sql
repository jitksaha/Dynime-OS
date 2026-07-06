
-- System email templates with block-based content
CREATE TABLE public.system_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL UNIQUE,
  name text NOT NULL,
  subject text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'auth',
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  variables text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  preview_html text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Enable RLS
ALTER TABLE public.system_email_templates ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage
CREATE POLICY "Super admins can manage email templates"
ON public.system_email_templates
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Anyone authenticated can read active templates (for rendering)
CREATE POLICY "Authenticated users can read active templates"
ON public.system_email_templates
FOR SELECT
TO authenticated
USING (is_active = true);

-- Timestamp trigger
CREATE TRIGGER update_system_email_templates_updated_at
BEFORE UPDATE ON public.system_email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default templates
INSERT INTO public.system_email_templates (template_key, name, subject, category, variables, blocks) VALUES
('signup_confirmation', 'Signup Confirmation', 'Confirm your email address', 'auth', 
 ARRAY['user_name', 'confirmation_url', 'company_name'],
 '[{"id":"1","type":"logo","props":{"width":120,"align":"center"}},{"id":"2","type":"heading","props":{"text":"Welcome to {{company_name}}!","level":1,"align":"center","color":"#1a1a1a"}},{"id":"3","type":"text","props":{"content":"Hi {{user_name}},\\n\\nThank you for signing up. Please confirm your email address to get started.","align":"left","color":"#555555"}},{"id":"4","type":"button","props":{"text":"Confirm Email","url":"{{confirmation_url}}","bgColor":"#000000","textColor":"#ffffff","align":"center","borderRadius":8}},{"id":"5","type":"divider","props":{"color":"#e5e5e5","thickness":1}},{"id":"6","type":"text","props":{"content":"If you didn''t create an account, you can safely ignore this email.","align":"center","color":"#999999","fontSize":12}}]'::jsonb),

('password_reset', 'Password Reset', 'Reset your password', 'auth',
 ARRAY['user_name', 'confirmation_url', 'company_name'],
 '[{"id":"1","type":"logo","props":{"width":120,"align":"center"}},{"id":"2","type":"heading","props":{"text":"Reset Your Password","level":1,"align":"center","color":"#1a1a1a"}},{"id":"3","type":"text","props":{"content":"Hi {{user_name}},\\n\\nWe received a request to reset your password. Click the button below to choose a new one.","align":"left","color":"#555555"}},{"id":"4","type":"button","props":{"text":"Reset Password","url":"{{confirmation_url}}","bgColor":"#000000","textColor":"#ffffff","align":"center","borderRadius":8}},{"id":"5","type":"text","props":{"content":"This link will expire in 24 hours. If you didn''t request a password reset, please ignore this email.","align":"center","color":"#999999","fontSize":12}}]'::jsonb),

('payment_receipt', 'Payment Receipt', 'Payment confirmation - {{amount}}', 'payment',
 ARRAY['user_name', 'company_name', 'amount', 'plan_name', 'payment_date', 'invoice_number', 'payment_method'],
 '[{"id":"1","type":"logo","props":{"width":120,"align":"center"}},{"id":"2","type":"heading","props":{"text":"Payment Receipt","level":1,"align":"center","color":"#1a1a1a"}},{"id":"3","type":"text","props":{"content":"Hi {{user_name}},\\n\\nThank you for your payment. Here are your transaction details:","align":"left","color":"#555555"}},{"id":"4","type":"columns","props":{"columns":2,"gap":16,"children":[[{"id":"4a","type":"text","props":{"content":"**Plan:** {{plan_name}}\\n**Amount:** {{amount}}","color":"#333333"}}],[{"id":"4b","type":"text","props":{"content":"**Date:** {{payment_date}}\\n**Invoice:** {{invoice_number}}","color":"#333333"}}]]}},{"id":"5","type":"divider","props":{"color":"#e5e5e5","thickness":1}},{"id":"6","type":"text","props":{"content":"Payment method: {{payment_method}}","align":"left","color":"#999999","fontSize":12}}]'::jsonb),

('welcome', 'Welcome Email', 'Welcome to {{company_name}}!', 'onboarding',
 ARRAY['user_name', 'company_name', 'login_url'],
 '[{"id":"1","type":"logo","props":{"width":120,"align":"center"}},{"id":"2","type":"heading","props":{"text":"Welcome aboard, {{user_name}}! 🎉","level":1,"align":"center","color":"#1a1a1a"}},{"id":"3","type":"text","props":{"content":"You''re all set up and ready to go. Here are a few things you can do to get started:","align":"left","color":"#555555"}},{"id":"4","type":"text","props":{"content":"✅ Complete your profile\\n✅ Invite your team members\\n✅ Explore the dashboard","align":"left","color":"#333333"}},{"id":"5","type":"button","props":{"text":"Go to Dashboard","url":"{{login_url}}","bgColor":"#000000","textColor":"#ffffff","align":"center","borderRadius":8}},{"id":"6","type":"social","props":{"align":"center","links":[{"platform":"twitter","url":"#"},{"platform":"linkedin","url":"#"}]}}]'::jsonb),

('notification_generic', 'Generic Notification', '{{subject}}', 'notification',
 ARRAY['user_name', 'company_name', 'subject', 'message', 'action_url', 'action_text'],
 '[{"id":"1","type":"logo","props":{"width":120,"align":"center"}},{"id":"2","type":"heading","props":{"text":"{{subject}}","level":2,"align":"left","color":"#1a1a1a"}},{"id":"3","type":"text","props":{"content":"Hi {{user_name}},\\n\\n{{message}}","align":"left","color":"#555555"}},{"id":"4","type":"button","props":{"text":"{{action_text}}","url":"{{action_url}}","bgColor":"#000000","textColor":"#ffffff","align":"center","borderRadius":8}}]'::jsonb),

('magic_link', 'Magic Link', 'Your login link', 'auth',
 ARRAY['user_name', 'confirmation_url', 'company_name'],
 '[{"id":"1","type":"logo","props":{"width":120,"align":"center"}},{"id":"2","type":"heading","props":{"text":"Your Magic Link","level":1,"align":"center","color":"#1a1a1a"}},{"id":"3","type":"text","props":{"content":"Hi {{user_name}},\\n\\nClick the button below to log in to your account. This link expires in 10 minutes.","align":"left","color":"#555555"}},{"id":"4","type":"button","props":{"text":"Log In","url":"{{confirmation_url}}","bgColor":"#000000","textColor":"#ffffff","align":"center","borderRadius":8}},{"id":"5","type":"text","props":{"content":"If you didn''t request this link, you can safely ignore this email.","align":"center","color":"#999999","fontSize":12}}]'::jsonb);
