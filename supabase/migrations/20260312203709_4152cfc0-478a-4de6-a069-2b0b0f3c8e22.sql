
-- Integration Apps Catalog (platform-wide app directory)
CREATE TABLE public.integration_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  long_description TEXT,
  icon_name TEXT NOT NULL DEFAULT 'Zap',
  category TEXT NOT NULL DEFAULT 'Other',
  subcategory TEXT,
  provider TEXT,
  auth_type TEXT NOT NULL DEFAULT 'webhook',
  is_featured BOOLEAN DEFAULT false,
  is_native BOOLEAN DEFAULT false,
  is_zapier_available BOOLEAN DEFAULT true,
  website_url TEXT,
  docs_url TEXT,
  zapier_template_url TEXT,
  supported_triggers TEXT[] DEFAULT '{}',
  supported_actions TEXT[] DEFAULT '{}',
  popularity_score INT DEFAULT 0,
  logo_url TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.integration_apps ENABLE ROW LEVEL SECURITY;

-- Public read for the catalog
CREATE POLICY "Anyone can view active apps" ON public.integration_apps
  FOR SELECT USING (is_active = true);

-- Super admins can manage
CREATE POLICY "Super admins manage apps" ON public.integration_apps
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Tenant App Connections (per-tenant integration instances)
CREATE TABLE public.tenant_app_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  app_id UUID NOT NULL REFERENCES public.integration_apps(id) ON DELETE CASCADE,
  connection_type TEXT NOT NULL DEFAULT 'webhook',
  status TEXT NOT NULL DEFAULT 'active',
  config JSONB DEFAULT '{}',
  webhook_url TEXT,
  zapier_webhook_url TEXT,
  last_synced_at TIMESTAMPTZ,
  sync_frequency TEXT DEFAULT 'realtime',
  error_message TEXT,
  events_sent INT DEFAULT 0,
  events_received INT DEFAULT 0,
  connected_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, app_id)
);

ALTER TABLE public.tenant_app_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.tenant_app_connections
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Zapier Automation Templates
CREATE TABLE public.zapier_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_app TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  action_app TEXT NOT NULL,
  action_event TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  zapier_template_url TEXT,
  popularity_score INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.zapier_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view templates" ON public.zapier_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Super admins manage templates" ON public.zapier_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Seed popular integration apps
INSERT INTO public.integration_apps (name, slug, description, icon_name, category, subcategory, auth_type, is_native, is_featured, supported_triggers, supported_actions, popularity_score) VALUES
-- Communication
('Slack', 'slack', 'Send notifications and updates to Slack channels', 'MessageSquare', 'Communication', 'Team Chat', 'webhook', true, true, ARRAY['new_deal', 'new_employee', 'invoice_paid'], ARRAY['send_message', 'create_channel'], 95),
('Discord', 'discord', 'Post updates to Discord servers and channels', 'MessageCircle', 'Communication', 'Team Chat', 'webhook', false, false, ARRAY['new_deal', 'new_ticket'], ARRAY['send_message'], 70),
('WhatsApp Business', 'whatsapp', 'Send messages and notifications via WhatsApp', 'Smartphone', 'Communication', 'Messaging', 'api_key', true, true, ARRAY['new_order', 'invoice_due'], ARRAY['send_message', 'send_template'], 90),
('Telegram', 'telegram', 'Send alerts and messages to Telegram bots', 'Send', 'Communication', 'Messaging', 'api_key', false, false, ARRAY['new_ticket', 'new_deal'], ARRAY['send_message'], 65),
('Twilio', 'twilio', 'SMS, voice calls, and communication APIs', 'Phone', 'Communication', 'SMS', 'api_key', false, true, ARRAY['new_order'], ARRAY['send_sms', 'make_call'], 85),
('Gmail', 'gmail', 'Send emails via Gmail SMTP', 'Mail', 'Communication', 'Email', 'oauth', true, true, ARRAY['new_email'], ARRAY['send_email', 'create_draft'], 92),
('Microsoft Teams', 'microsoft-teams', 'Post notifications to Teams channels', 'Users', 'Communication', 'Team Chat', 'webhook', false, true, ARRAY['new_deal', 'new_task'], ARRAY['send_message', 'create_meeting'], 80),
('SendGrid', 'sendgrid', 'Transactional and marketing email delivery', 'Mail', 'Communication', 'Email', 'api_key', false, true, ARRAY['email_opened', 'email_bounced'], ARRAY['send_email', 'add_contact'], 82),

-- Productivity
('Google Calendar', 'google-calendar', 'Sync events, meetings, and deadlines', 'Calendar', 'Productivity', 'Calendar', 'oauth', true, true, ARRAY['event_created', 'event_updated'], ARRAY['create_event', 'update_event'], 88),
('Google Drive', 'google-drive', 'Store and share files seamlessly', 'HardDrive', 'Productivity', 'Storage', 'oauth', true, true, ARRAY['file_uploaded'], ARRAY['upload_file', 'create_folder'], 86),
('Google Sheets', 'google-sheets', 'Sync data to and from spreadsheets', 'Table', 'Productivity', 'Spreadsheet', 'oauth', false, true, ARRAY['row_added', 'row_updated'], ARRAY['add_row', 'update_row'], 90),
('Notion', 'notion', 'Sync pages, databases, and documents', 'BookOpen', 'Productivity', 'Docs', 'oauth', false, true, ARRAY['page_created', 'database_updated'], ARRAY['create_page', 'update_database'], 84),
('Trello', 'trello', 'Manage cards and boards for project tracking', 'Layout', 'Productivity', 'Project Mgmt', 'oauth', false, false, ARRAY['card_created', 'card_moved'], ARRAY['create_card', 'move_card'], 72),
('Asana', 'asana', 'Track tasks and projects across teams', 'CheckSquare', 'Productivity', 'Project Mgmt', 'oauth', false, false, ARRAY['task_created', 'task_completed'], ARRAY['create_task', 'update_task'], 75),
('Jira', 'jira', 'Issue tracking and agile project management', 'Bug', 'Productivity', 'Project Mgmt', 'oauth', false, true, ARRAY['issue_created', 'issue_updated'], ARRAY['create_issue', 'update_issue'], 78),
('Dropbox', 'dropbox', 'Cloud file storage and sharing', 'Cloud', 'Productivity', 'Storage', 'oauth', false, false, ARRAY['file_added'], ARRAY['upload_file'], 68),
('OneDrive', 'onedrive', 'Microsoft cloud storage integration', 'Cloud', 'Productivity', 'Storage', 'oauth', false, false, ARRAY['file_added'], ARRAY['upload_file'], 65),

-- Finance
('Stripe', 'stripe', 'Payment processing and subscription management', 'CreditCard', 'Finance', 'Payments', 'api_key', true, true, ARRAY['payment_received', 'subscription_created'], ARRAY['create_charge', 'create_invoice'], 96),
('PayPal', 'paypal', 'Online payment processing worldwide', 'DollarSign', 'Finance', 'Payments', 'oauth', false, true, ARRAY['payment_received', 'refund_issued'], ARRAY['create_payment', 'send_invoice'], 88),
('QuickBooks', 'quickbooks', 'Accounting, invoicing, and bookkeeping', 'Calculator', 'Finance', 'Accounting', 'oauth', false, true, ARRAY['invoice_created', 'payment_received'], ARRAY['create_invoice', 'create_expense'], 85),
('Xero', 'xero', 'Cloud-based accounting software', 'PieChart', 'Finance', 'Accounting', 'oauth', false, true, ARRAY['invoice_created', 'bill_created'], ARRAY['create_invoice', 'create_contact'], 80),
('FreshBooks', 'freshbooks', 'Invoicing and expense tracking', 'FileText', 'Finance', 'Accounting', 'oauth', false, false, ARRAY['invoice_sent', 'payment_received'], ARRAY['create_invoice', 'create_expense'], 70),
('Square', 'square', 'POS and payment processing', 'Square', 'Finance', 'Payments', 'api_key', false, false, ARRAY['payment_received', 'order_created'], ARRAY['create_payment'], 72),

-- Marketing
('Mailchimp', 'mailchimp', 'Email marketing and audience management', 'Mail', 'Marketing', 'Email Marketing', 'api_key', false, true, ARRAY['subscriber_added', 'campaign_sent'], ARRAY['add_subscriber', 'create_campaign'], 88),
('HubSpot', 'hubspot', 'CRM, marketing, and sales automation', 'Target', 'Marketing', 'CRM', 'oauth', false, true, ARRAY['contact_created', 'deal_created'], ARRAY['create_contact', 'create_deal'], 90),
('Google Ads', 'google-ads', 'Online advertising and PPC campaigns', 'Megaphone', 'Marketing', 'Advertising', 'oauth', false, true, ARRAY['conversion_tracked'], ARRAY['create_campaign', 'update_budget'], 82),
('Facebook Ads', 'facebook-ads', 'Social media advertising platform', 'Facebook', 'Marketing', 'Advertising', 'oauth', false, false, ARRAY['lead_created'], ARRAY['create_ad', 'update_campaign'], 78),
('ActiveCampaign', 'activecampaign', 'Email marketing and automation', 'Zap', 'Marketing', 'Automation', 'api_key', false, false, ARRAY['contact_created', 'tag_added'], ARRAY['create_contact', 'add_tag'], 74),
('Intercom', 'intercom', 'Customer messaging and engagement', 'MessageCircle', 'Marketing', 'Customer Support', 'oauth', false, true, ARRAY['conversation_started', 'user_created'], ARRAY['send_message', 'create_user'], 80),

-- Automation
('Zapier', 'zapier', 'Connect 7,000+ apps with automated workflows', 'Zap', 'Automation', 'iPaaS', 'webhook', true, true, ARRAY['any_event'], ARRAY['trigger_zap'], 98),
('Make (Integromat)', 'make', 'Visual automation platform for workflows', 'Workflow', 'Automation', 'iPaaS', 'webhook', false, true, ARRAY['any_event'], ARRAY['trigger_scenario'], 82),
('n8n', 'n8n', 'Open-source workflow automation tool', 'GitBranch', 'Automation', 'iPaaS', 'webhook', false, false, ARRAY['any_event'], ARRAY['trigger_workflow'], 70),

-- Developer
('GitHub', 'github', 'Code hosting and version control', 'Github', 'Developer', 'Dev Tools', 'oauth', false, true, ARRAY['push_event', 'pr_created'], ARRAY['create_issue', 'create_pr'], 85),
('Webhooks', 'custom-webhook', 'Send events to any HTTP endpoint', 'Webhook', 'Developer', 'Custom', 'webhook', true, true, ARRAY['any_event'], ARRAY['send_payload'], 90);

-- Seed popular Zapier templates
INSERT INTO public.zapier_templates (name, description, trigger_app, trigger_event, action_app, action_event, category, popularity_score) VALUES
('New Deal → Slack Alert', 'Get notified in Slack when a new CRM deal is created', 'Dynime CRM', 'new_deal', 'Slack', 'send_message', 'Sales', 95),
('New Employee → Google Sheet', 'Add new employee data to a Google Sheets spreadsheet', 'Dynime HRM', 'new_employee', 'Google Sheets', 'add_row', 'HR', 88),
('Invoice Paid → QuickBooks', 'Sync paid invoices to QuickBooks automatically', 'Dynime Accounting', 'invoice_paid', 'QuickBooks', 'create_payment', 'Finance', 90),
('New Ticket → Trello Card', 'Create Trello cards from helpdesk tickets', 'Dynime Helpdesk', 'new_ticket', 'Trello', 'create_card', 'Support', 82),
('New Lead → Mailchimp', 'Add CRM leads to Mailchimp audience lists', 'Dynime CRM', 'new_lead', 'Mailchimp', 'add_subscriber', 'Marketing', 85),
('New Order → WhatsApp Notification', 'Send WhatsApp messages when orders are placed', 'Dynime POS', 'new_order', 'WhatsApp', 'send_message', 'Sales', 80),
('Task Completed → Slack', 'Notify Slack when a project task is completed', 'Dynime Projects', 'task_completed', 'Slack', 'send_message', 'Productivity', 78),
('New Expense → Xero', 'Log expenses automatically in Xero', 'Dynime Accounting', 'new_expense', 'Xero', 'create_expense', 'Finance', 76),
('Leave Approved → Google Calendar', 'Block calendar dates when leave is approved', 'Dynime HRM', 'leave_approved', 'Google Calendar', 'create_event', 'HR', 84),
('New Contact → HubSpot', 'Sync CRM contacts to HubSpot automatically', 'Dynime CRM', 'new_contact', 'HubSpot', 'create_contact', 'Marketing', 86),
('Invoice Created → Stripe', 'Create Stripe invoices from your billing module', 'Dynime Accounting', 'invoice_created', 'Stripe', 'create_invoice', 'Finance', 88),
('Campaign Sent → Discord Alert', 'Post marketing campaign updates to Discord', 'Dynime Marketing', 'campaign_sent', 'Discord', 'send_message', 'Marketing', 68);
