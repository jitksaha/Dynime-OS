
-- SMS Gateway configurations (Super Admin managed)
CREATE TABLE public.sms_gateway_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  api_url text NOT NULL DEFAULT '',
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_enabled boolean NOT NULL DEFAULT false,
  is_sandbox boolean NOT NULL DEFAULT true,
  supported_countries text[] DEFAULT ARRAY['BD'],
  config_fields jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_gateway_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage SMS gateways"
  ON public.sms_gateway_configs FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Anyone can view enabled SMS gateways"
  ON public.sms_gateway_configs FOR SELECT
  USING (true);

CREATE TRIGGER update_sms_gateway_configs_updated_at
  BEFORE UPDATE ON public.sms_gateway_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed popular SMS gateways
INSERT INTO public.sms_gateway_configs (gateway_key, display_name, api_url, config_fields, supported_countries) VALUES
('alpha_sms', 'Alpha SMS', 'https://api.sms.net.bd/sendsms', '[{"key":"api_key","label":"API Key","type":"text","required":true},{"key":"sender_id","label":"Sender ID","type":"text","required":false}]'::jsonb, ARRAY['BD']),
('green_web', 'Green Web SMS', 'https://api.greenweb.com.bd/api.php', '[{"key":"token","label":"API Token","type":"text","required":true},{"key":"sender_id","label":"Sender ID","type":"text","required":false}]'::jsonb, ARRAY['BD']),
('bdbulk_sms', 'BDBulk SMS', 'https://api.bdbulksms.net/api.php', '[{"key":"api_key","label":"API Key","type":"text","required":true},{"key":"sender_id","label":"Sender ID","type":"text","required":false}]'::jsonb, ARRAY['BD']),
('dynahost_sms', 'Dynahost SMS', 'https://sms.dynahost.com.bd/api', '[{"key":"api_key","label":"API Key","type":"text","required":true},{"key":"secret_key","label":"Secret Key","type":"text","required":true},{"key":"sender_id","label":"Sender ID","type":"text","required":false}]'::jsonb, ARRAY['BD']),
('twilio', 'Twilio', 'https://api.twilio.com/2010-04-01', '[{"key":"account_sid","label":"Account SID","type":"text","required":true},{"key":"auth_token","label":"Auth Token","type":"password","required":true},{"key":"from_number","label":"From Number","type":"text","required":true}]'::jsonb, ARRAY['US','GB','BD','IN','CA','AU']),
('nexmo', 'Vonage (Nexmo)', 'https://rest.nexmo.com/sms/json', '[{"key":"api_key","label":"API Key","type":"text","required":true},{"key":"api_secret","label":"API Secret","type":"password","required":true},{"key":"from","label":"From Name/Number","type":"text","required":true}]'::jsonb, ARRAY['US','GB','BD','IN','CA','AU']),
('msg91', 'MSG91', 'https://control.msg91.com/api/v5', '[{"key":"auth_key","label":"Auth Key","type":"text","required":true},{"key":"sender_id","label":"Sender ID (6 char)","type":"text","required":true},{"key":"route","label":"Route (1=Promo,4=Trans)","type":"text","required":false}]'::jsonb, ARRAY['BD','IN']);

-- Notification event definitions (what events can trigger notifications)
CREATE TABLE public.notification_event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  event_label text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  description text,
  default_sms_template text,
  default_email_subject text,
  default_email_body text,
  available_variables text[] DEFAULT ARRAY[]::text[],
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_event_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view notification event types"
  ON public.notification_event_types FOR SELECT USING (true);

CREATE POLICY "Super admins can manage event types"
  ON public.notification_event_types FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Seed system notification events
INSERT INTO public.notification_event_types (event_key, event_label, category, description, default_sms_template, default_email_subject, default_email_body, available_variables, is_system) VALUES
-- Billing events (Super Admin → Company)
('invoice_created', 'Invoice Created', 'billing', 'When a new invoice is generated', 'Invoice {{invoice_number}} for {{amount}} has been created. Due: {{due_date}}', 'Invoice {{invoice_number}} Created', '<p>Invoice <b>{{invoice_number}}</b> for <b>{{amount}}</b> has been generated. Due date: {{due_date}}</p>', ARRAY['invoice_number','amount','due_date','client_name','company_name'], true),
('payment_success', 'Payment Successful', 'billing', 'When a payment is successfully processed', 'Payment of {{amount}} received for {{reference}}. Thank you!', 'Payment Confirmed - {{amount}}', '<p>Payment of <b>{{amount}}</b> for <b>{{reference}}</b> has been successfully processed.</p>', ARRAY['amount','reference','payment_method','company_name','date'], true),
('payment_failed', 'Payment Failed', 'billing', 'When a payment attempt fails', 'Payment of {{amount}} for {{reference}} has failed. Please retry.', 'Payment Failed - Action Required', '<p>Payment of <b>{{amount}}</b> for <b>{{reference}}</b> has failed. Please update your payment method.</p>', ARRAY['amount','reference','reason','company_name'], true),
('subscription_overdue', 'Subscription Overdue', 'billing', 'When subscription payment is overdue', 'Your {{plan_name}} subscription is overdue. Please make payment to avoid interruption.', 'Subscription Overdue - {{plan_name}}', '<p>Your <b>{{plan_name}}</b> subscription is overdue. Please make payment to continue access.</p>', ARRAY['plan_name','amount','due_date','company_name'], true),
('subscription_renewed', 'Subscription Renewed', 'billing', 'When subscription auto-renews', 'Your {{plan_name}} subscription has been renewed. Next billing: {{next_date}}', 'Subscription Renewed - {{plan_name}}', '<p>Your subscription to <b>{{plan_name}}</b> has been renewed successfully.</p>', ARRAY['plan_name','amount','next_date','company_name'], true),
('pre_payment_reminder', 'Pre-Payment Reminder', 'billing', 'Reminder before upcoming payment', 'Reminder: Payment of {{amount}} for {{plan_name}} is due on {{due_date}}.', 'Upcoming Payment Reminder', '<p>This is a reminder that your payment of <b>{{amount}}</b> for <b>{{plan_name}}</b> is due on <b>{{due_date}}</b>.</p>', ARRAY['amount','plan_name','due_date','company_name'], true),
-- HR events
('employee_onboarded', 'Employee Onboarded', 'hr', 'When a new employee joins', 'Welcome to {{company_name}}! Your onboarding is complete, {{employee_name}}.', 'Welcome to {{company_name}}', '<p>Welcome <b>{{employee_name}}</b>! Your onboarding at <b>{{company_name}}</b> is complete.</p>', ARRAY['employee_name','company_name','department','position'], true),
('leave_approved', 'Leave Approved', 'hr', 'When leave request is approved', '{{employee_name}}, your leave from {{start_date}} to {{end_date}} has been approved.', 'Leave Request Approved', '<p>Your leave request from <b>{{start_date}}</b> to <b>{{end_date}}</b> has been approved.</p>', ARRAY['employee_name','start_date','end_date','leave_type'], true),
('payslip_generated', 'Payslip Generated', 'hr', 'When payslip is generated', '{{employee_name}}, your payslip for {{month}} is ready. Net: {{amount}}', 'Payslip Ready - {{month}}', '<p>Your payslip for <b>{{month}}</b> is ready. Net salary: <b>{{amount}}</b></p>', ARRAY['employee_name','month','amount','company_name'], true),
-- CRM events
('deal_won', 'Deal Won', 'crm', 'When a deal is marked as won', 'Deal "{{deal_name}}" worth {{amount}} has been won! 🎉', 'Deal Won - {{deal_name}}', '<p>Congratulations! Deal <b>{{deal_name}}</b> worth <b>{{amount}}</b> has been won.</p>', ARRAY['deal_name','amount','contact_name','company_name'], true),
('customer_invoice', 'Customer Invoice', 'crm', 'Invoice sent to customer', 'Invoice {{invoice_number}} for {{amount}} from {{company_name}}. Due: {{due_date}}', 'Invoice from {{company_name}}', '<p>Invoice <b>{{invoice_number}}</b> for <b>{{amount}}</b>. Due: <b>{{due_date}}</b></p>', ARRAY['invoice_number','amount','due_date','company_name','client_name'], true),
-- General
('custom_notification', 'Custom Notification', 'general', 'Custom message from admin', '{{message}}', '{{subject}}', '<p>{{message}}</p>', ARRAY['subject','message','company_name'], true);

-- Tenant notification preferences (Company Admin configures which events trigger Email/SMS)
CREATE TABLE public.tenant_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  sms_enabled boolean NOT NULL DEFAULT false,
  email_enabled boolean NOT NULL DEFAULT true,
  sms_gateway_key text,
  custom_sms_template text,
  custom_email_subject text,
  custom_email_body text,
  recipient_type text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, event_key)
);

ALTER TABLE public.tenant_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant preferences"
  ON public.tenant_notification_preferences FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Company admins can manage preferences"
  ON public.tenant_notification_preferences FOR ALL
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE TRIGGER update_tenant_notification_prefs_updated_at
  BEFORE UPDATE ON public.tenant_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SMS send log
CREATE TABLE public.sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  gateway_key text NOT NULL,
  recipient_phone text NOT NULL,
  message text NOT NULL,
  event_key text,
  status text NOT NULL DEFAULT 'pending',
  gateway_response jsonb DEFAULT '{}'::jsonb,
  sent_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant SMS logs"
  ON public.sms_logs FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "System can insert SMS logs"
  ON public.sms_logs FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_sms_logs_tenant ON public.sms_logs(tenant_id, created_at DESC);
