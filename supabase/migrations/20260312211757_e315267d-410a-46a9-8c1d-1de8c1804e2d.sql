
-- Add missing modules to platform_modules (those that have feature pages but aren't in the table)
INSERT INTO platform_modules (name, label, description, icon, is_active, sort_order)
VALUES
  ('team_chat', 'Team Chat', 'Real-time messaging & collaboration', 'message-square', true, 11),
  ('calendar', 'Calendar', 'Events, scheduling & reminders', 'calendar', true, 12),
  ('recruitment', 'Recruitment', 'Job postings & applicant tracking', 'briefcase', true, 13),
  ('tax_compliance', 'Tax Compliance', 'Multi-jurisdiction tax management', 'percent', true, 14),
  ('security', 'Security', 'Access control, audit logs & compliance', 'shield', true, 15),
  ('integrations', 'Integrations', 'API access, webhooks & third-party apps', 'zap', true, 16),
  ('portals', 'Portals', 'Employee & customer self-service portals', 'globe', true, 17),
  ('sms', 'SMS', 'Bulk & transactional SMS messaging', 'smartphone', true, 18),
  ('whatsapp', 'WhatsApp', 'Business messaging & templates', 'phone', true, 19),
  ('meetings', 'Meetings', 'Video calls & scheduling', 'video', true, 20),
  ('notifications', 'Notifications', 'Multi-channel alert system', 'bell', true, 21),
  ('api', 'API Platform', 'Developer REST API & documentation', 'code', true, 22),
  ('email', 'Email', 'SMTP configuration & email templates', 'mail', true, 23),
  ('ai_assistant', 'Dynime AI', 'AI-powered business assistant & automation', 'bot', true, 24)
ON CONFLICT (name) DO NOTHING;
