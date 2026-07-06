
-- Add phone_verified to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified_at timestamp with time zone;

-- Phone OTP verification codes
CREATE TABLE public.phone_otp_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  phone text NOT NULL,
  otp_code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.phone_otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own OTP codes" ON public.phone_otp_codes
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_phone_otp_user ON public.phone_otp_codes(user_id, verified);

-- SMS Templates table for all platform events
CREATE TABLE public.sms_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_key text NOT NULL UNIQUE,
  event_label text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  template_body text NOT NULL,
  variables text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage templates
CREATE POLICY "Super admins can manage SMS templates" ON public.sms_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- Allow authenticated users to read active templates (needed for sending)
CREATE POLICY "Authenticated users can read active SMS templates" ON public.sms_templates
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

-- Trigger for updated_at
CREATE TRIGGER update_sms_templates_updated_at
  BEFORE UPDATE ON public.sms_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default SMS templates
INSERT INTO public.sms_templates (event_key, event_label, category, template_body, variables, description) VALUES
  ('phone_verification', 'Phone Verification OTP', 'authentication', 'Your {{app_name}} verification code is: {{otp_code}}. Valid for {{expiry_minutes}} minutes. Do not share this code.', ARRAY['app_name', 'otp_code', 'expiry_minutes'], 'Sent when a user verifies their phone number'),
  ('login_otp', 'Login OTP', 'authentication', 'Your {{app_name}} login code is: {{otp_code}}. Valid for {{expiry_minutes}} minutes.', ARRAY['app_name', 'otp_code', 'expiry_minutes'], 'Sent for two-factor login verification'),
  ('password_reset', 'Password Reset OTP', 'authentication', 'Your {{app_name}} password reset code is: {{otp_code}}. Valid for {{expiry_minutes}} minutes.', ARRAY['app_name', 'otp_code', 'expiry_minutes'], 'Sent when user requests password reset via SMS'),
  ('invoice_reminder', 'Invoice Reminder', 'billing', 'Hi {{customer_name}}, your invoice #{{invoice_number}} of {{currency}}{{amount}} is due on {{due_date}}. Pay now at {{payment_link}}.', ARRAY['customer_name', 'invoice_number', 'currency', 'amount', 'due_date', 'payment_link'], 'Sent as invoice payment reminder'),
  ('payment_confirmation', 'Payment Confirmation', 'billing', 'Payment of {{currency}}{{amount}} received for {{description}}. Transaction ID: {{transaction_id}}. Thank you!', ARRAY['currency', 'amount', 'description', 'transaction_id'], 'Sent after successful payment'),
  ('subscription_expiry', 'Subscription Expiry Warning', 'billing', 'Your {{app_name}} {{plan_name}} subscription expires on {{expiry_date}}. Renew to avoid service interruption.', ARRAY['app_name', 'plan_name', 'expiry_date'], 'Sent before subscription expires'),
  ('employee_onboarding', 'Employee Onboarding', 'hrm', 'Welcome to {{company_name}}, {{employee_name}}! Your employee portal access: {{portal_link}}. Contact HR for any questions.', ARRAY['company_name', 'employee_name', 'portal_link'], 'Sent to new employees'),
  ('leave_approved', 'Leave Approved', 'hrm', 'Hi {{employee_name}}, your {{leave_type}} leave from {{start_date}} to {{end_date}} has been approved by {{approver_name}}.', ARRAY['employee_name', 'leave_type', 'start_date', 'end_date', 'approver_name'], 'Sent when leave request is approved'),
  ('leave_rejected', 'Leave Rejected', 'hrm', 'Hi {{employee_name}}, your {{leave_type}} leave request from {{start_date}} to {{end_date}} has been declined. Reason: {{reason}}.', ARRAY['employee_name', 'leave_type', 'start_date', 'end_date', 'reason'], 'Sent when leave request is rejected'),
  ('attendance_alert', 'Attendance Alert', 'hrm', 'Hi {{employee_name}}, you have not checked in today ({{date}}). Please check in or contact your manager.', ARRAY['employee_name', 'date'], 'Sent for missing attendance'),
  ('deal_won', 'Deal Won Notification', 'crm', 'Congratulations! Deal "{{deal_name}}" worth {{currency}}{{deal_value}} has been marked as won. 🎉', ARRAY['deal_name', 'currency', 'deal_value'], 'Sent when a CRM deal is won'),
  ('task_assigned', 'Task Assigned', 'projects', 'You have been assigned a new task: "{{task_name}}" in project "{{project_name}}". Due: {{due_date}}.', ARRAY['task_name', 'project_name', 'due_date'], 'Sent when a task is assigned'),
  ('order_confirmation', 'Order Confirmation', 'pos', 'Order #{{order_id}} confirmed! {{item_count}} items totaling {{currency}}{{total}}. Track: {{tracking_link}}.', ARRAY['order_id', 'item_count', 'currency', 'total', 'tracking_link'], 'Sent after order is placed'),
  ('shipping_update', 'Shipping Update', 'pos', 'Your order #{{order_id}} has been shipped via {{courier_name}}. Tracking: {{tracking_number}}.', ARRAY['order_id', 'courier_name', 'tracking_number'], 'Sent when order is shipped'),
  ('custom_notification', 'Custom Notification', 'general', '{{message}}', ARRAY['message'], 'Generic template for custom notifications'),
  ('wallet_topup', 'Wallet Top-up Confirmation', 'billing', 'Your wallet has been credited with {{currency}}{{amount}}. New balance: {{currency}}{{new_balance}}.', ARRAY['currency', 'amount', 'new_balance'], 'Sent after wallet top-up'),
  ('warning_issued', 'Employee Warning', 'hrm', 'Hi {{employee_name}}, a {{severity}} warning has been issued: {{reason}}. Please contact HR for details.', ARRAY['employee_name', 'severity', 'reason'], 'Sent when employee warning is issued'),
  ('payroll_processed', 'Payroll Processed', 'hrm', 'Hi {{employee_name}}, your salary of {{currency}}{{amount}} for {{period}} has been processed. Check your payslip in the portal.', ARRAY['employee_name', 'currency', 'amount', 'period'], 'Sent when payroll is processed')
ON CONFLICT (event_key) DO NOTHING;
