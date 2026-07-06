
-- WhatsApp gateway configs (platform-level, like sms_gateway_configs)
CREATE TABLE public.whatsapp_gateway_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  api_url text NOT NULL DEFAULT '',
  credentials jsonb NOT NULL DEFAULT '{}',
  is_enabled boolean NOT NULL DEFAULT false,
  is_sandbox boolean NOT NULL DEFAULT false,
  supported_countries text[] DEFAULT '{}',
  config_fields jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_gateway_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage whatsapp gateways"
ON public.whatsapp_gateway_configs
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Tenant WhatsApp gateway configs (like tenant_sms_gateway_configs)
CREATE TABLE public.tenant_whatsapp_gateway_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  gateway_key text NOT NULL DEFAULT '',
  api_url text NOT NULL DEFAULT '',
  credentials jsonb NOT NULL DEFAULT '{}',
  is_enabled boolean NOT NULL DEFAULT false,
  use_own_gateway boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE public.tenant_whatsapp_gateway_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can manage own whatsapp config"
ON public.tenant_whatsapp_gateway_configs
FOR ALL TO authenticated
USING (tenant_id = public.get_user_tenant_id(auth.uid()))
WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- WhatsApp templates (like sms_templates)
CREATE TABLE public.whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  template_body text NOT NULL DEFAULT '',
  variables text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  category text NOT NULL DEFAULT 'transactional',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage whatsapp templates"
ON public.whatsapp_templates
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Authenticated users can read whatsapp templates"
ON public.whatsapp_templates
FOR SELECT TO authenticated
USING (true);

-- WhatsApp logs (like sms_logs)
CREATE TABLE public.whatsapp_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  gateway_key text NOT NULL,
  recipient_phone text NOT NULL,
  message text NOT NULL,
  event_key text,
  status text NOT NULL DEFAULT 'pending',
  gateway_response jsonb DEFAULT '{}',
  sent_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant whatsapp logs"
ON public.whatsapp_logs
FOR SELECT TO authenticated
USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Service can insert whatsapp logs"
ON public.whatsapp_logs
FOR INSERT TO authenticated
WITH CHECK (true);

-- Seed default gateway configurations
INSERT INTO public.whatsapp_gateway_configs (gateway_key, display_name, api_url, config_fields) VALUES
('meta_cloud_api', 'Meta Cloud API (Official)', 'https://graph.facebook.com/v21.0', '[{"key":"access_token","label":"Permanent Access Token","type":"password","required":true},{"key":"phone_number_id","label":"Phone Number ID","type":"text","required":true},{"key":"business_account_id","label":"Business Account ID","type":"text","required":false},{"key":"app_id","label":"App ID","type":"text","required":false}]'),
('aisensy', 'AiSensy', 'https://backend.aisensy.com/campaign/t1/api/v2', '[{"key":"api_key","label":"API Key","type":"password","required":true},{"key":"campaign_name","label":"Default Campaign Name","type":"text","required":false}]');

-- Seed default WhatsApp templates
INSERT INTO public.whatsapp_templates (event_key, display_name, template_body, variables, category) VALUES
('phone_verification', 'Phone Verification OTP', 'Your {{app_name}} verification code is: {{otp_code}}. Valid for {{expiry_minutes}} minutes. Do not share this code.', ARRAY['app_name','otp_code','expiry_minutes'], 'authentication'),
('login_otp', 'Login OTP', 'Your {{app_name}} login code is: {{otp_code}}. Valid for {{expiry_minutes}} minutes.', ARRAY['app_name','otp_code','expiry_minutes'], 'authentication'),
('invoice_sent', 'Invoice Sent', 'Hi {{customer_name}}, your invoice #{{invoice_number}} for {{amount}} {{currency}} from {{company_name}} is ready. View: {{invoice_link}}', ARRAY['customer_name','invoice_number','amount','currency','company_name','invoice_link'], 'transactional'),
('payment_received', 'Payment Received', 'Hi {{customer_name}}, we received your payment of {{amount}} {{currency}} for invoice #{{invoice_number}}. Thank you!', ARRAY['customer_name','amount','currency','invoice_number'], 'transactional'),
('order_confirmation', 'Order Confirmation', 'Hi {{customer_name}}, your order #{{order_number}} has been confirmed! Total: {{amount}} {{currency}}. Track: {{tracking_link}}', ARRAY['customer_name','order_number','amount','currency','tracking_link'], 'transactional'),
('order_shipped', 'Order Shipped', 'Hi {{customer_name}}, your order #{{order_number}} has been shipped! Tracking: {{tracking_number}}. Expected delivery: {{delivery_date}}', ARRAY['customer_name','order_number','tracking_number','delivery_date'], 'transactional'),
('leave_approved', 'Leave Approved', 'Hi {{employee_name}}, your {{leave_type}} leave from {{start_date}} to {{end_date}} has been approved by {{approver_name}}.', ARRAY['employee_name','leave_type','start_date','end_date','approver_name'], 'notification'),
('salary_credited', 'Salary Credited', 'Hi {{employee_name}}, your salary of {{amount}} {{currency}} for {{month}} has been credited to your account.', ARRAY['employee_name','amount','currency','month'], 'notification'),
('appointment_reminder', 'Appointment Reminder', 'Hi {{customer_name}}, reminder: you have an appointment at {{time}} on {{date}} with {{company_name}}. Location: {{location}}', ARRAY['customer_name','time','date','company_name','location'], 'notification'),
('welcome_message', 'Welcome Message', 'Welcome to {{app_name}}, {{user_name}}! Your account has been created successfully. Get started: {{link}}', ARRAY['app_name','user_name','link'], 'marketing');
