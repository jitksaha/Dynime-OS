
-- Platform Modules
INSERT INTO platform_modules (name, label, description, icon, category, is_active, is_premium, sort_order, route) VALUES
('hrms', 'HRM', 'Employee management, attendance, payroll & recruitment', 'users', 'core', true, false, 1, '/features/hrm'),
('crm', 'CRM', 'Sales pipeline, deal tracking & contact management', 'handshake', 'core', true, false, 2, '/features/crm'),
('marketing', 'Marketing', 'Campaign automation, email templates & analytics', 'megaphone', 'core', true, false, 3, '/features/marketing'),
('workflows', 'Workflows', 'Visual drag-and-drop automation builder', 'workflow', 'core', true, false, 4, '/features/workflows'),
('accounting', 'Accounting', 'Invoicing, expense tracking & financial reporting', 'calculator', 'core', true, false, 5, '/features/accounting'),
('helpdesk', 'Helpdesk', 'Ticket management, SLA tracking & knowledge base', 'headphones', 'core', true, false, 6, '/features/helpdesk'),
('projects', 'Projects', 'Task boards, milestones & team collaboration', 'kanban', 'core', true, false, 7, '/features/projects'),
('documents', 'Documents', 'Centralized file storage & document sharing', 'file', 'core', true, false, 8, '/features/documents'),
('reports', 'Reports', 'Business intelligence dashboards & data visualization', 'bar-chart', 'core', true, false, 9, '/features/reports'),
('team_chat', 'Team Chat', 'Real-time messaging & channel collaboration', 'message-square', 'communication', true, false, 10, '/features/team-chat'),
('product_hub', 'POS & eCommerce', 'Point of sale, inventory & product management', 'shopping-bag', 'commerce', true, false, 11, '/features/pos'),
('calendar', 'Calendar', 'Events, scheduling & meeting management', 'calendar', 'productivity', true, false, 12, '/features/calendar'),
('wallet', 'Wallet', 'Digital payments, billing & financial tools', 'wallet', 'finance', true, false, 13, '/features/wallet'),
('tax_compliance', 'Tax Compliance', 'Multi-jurisdiction tax management & filing', 'percent', 'finance', true, true, 14, '/features/tax-compliance'),
('security', 'Security', 'Access controls, audit logs & threat protection', 'shield', 'admin', true, false, 15, '/features/security'),
('integrations', 'Integrations', 'Third-party app connectors & API webhooks', 'zap', 'admin', true, false, 16, '/features/integrations'),
('portals', 'Portals', 'Customer & employee self-service portals', 'globe', 'admin', true, true, 17, '/features/portals'),
('recruitment', 'Recruitment', 'Job postings, applicant tracking & hiring', 'briefcase', 'hr', true, true, 18, '/features/recruitment'),
('sms', 'SMS', 'Bulk SMS, templates & delivery tracking', 'smartphone', 'communication', true, true, 19, '/features/sms'),
('whatsapp', 'WhatsApp', 'WhatsApp Business messaging & templates', 'phone', 'communication', true, true, 20, '/features/whatsapp'),
('meetings', 'Meetings', 'Video conferencing & meeting scheduling', 'video', 'communication', true, true, 21, '/features/meetings'),
('notifications', 'Notifications', 'Multi-channel alert & notification system', 'bell', 'admin', true, false, 22, '/features/notifications'),
('api', 'API', 'RESTful API, API keys & developer tools', 'code', 'admin', true, true, 23, '/features/api'),
('email', 'Email', 'Transactional email & email template builder', 'mail', 'communication', true, false, 24, '/features/email'),
('ai_assistant', 'AI Assistant', 'AI-powered copilot for business automation', 'bot', 'ai', true, true, 25, '/features/ai'),
('okr', 'OKR', 'Objectives & key results tracking', 'target', 'productivity', true, true, 26, '/features/okr'),
('subscription_management', 'Subscriptions', 'Recurring billing & subscription management', 'refresh-cw', 'finance', true, true, 27, '/features/subscription-management'),
('budget_planning', 'Budget Planning', 'Budget allocation, tracking & forecasting', 'pie-chart', 'finance', true, true, 28, '/features/budget-planning'),
('compliance', 'Compliance', 'Regulatory compliance tracking & checklists', 'shield', 'compliance', true, true, 29, '/features/compliance'),
('lms', 'LMS', 'Learning management & employee training', 'graduation-cap', 'hr', true, true, 30, '/features/lms'),
('it_asset', 'IT Assets', 'Asset tracking, inventory & maintenance', 'monitor', 'admin', true, true, 31, '/features/it-asset'),
('commission', 'Commission', 'Sales commission calculation & payouts', 'dollar-sign', 'finance', true, true, 32, '/features/commission'),
('visitor_management', 'Visitors', 'Visitor check-in, badges & tracking', 'building', 'admin', true, true, 33, '/features/visitor-management'),
('esg', 'ESG', 'Environmental, social & governance reporting', 'leaf', 'compliance', true, true, 34, '/features/esg'),
('vendor_portal', 'Vendor Portal', 'Vendor onboarding, POs & invoicing', 'store', 'procurement', true, true, 35, '/features/vendor-portal'),
('territory', 'Territory', 'Sales territory mapping & management', 'map', 'sales', true, true, 36, '/features/territory'),
('gamification', 'Gamification', 'Employee engagement through game mechanics', 'gamepad', 'hr', true, true, 37, '/features/gamification'),
('expense_management', 'Expenses', 'Expense claims, approvals & reimbursement', 'receipt', 'finance', true, true, 38, '/features/expense-management'),
('control_tower', 'Control Tower', 'Real-time operational monitoring dashboard', 'activity', 'admin', true, true, 39, '/features/control-tower'),
('multi_entity', 'Multi-Entity', 'Multi-company & subsidiary management', 'building-2', 'admin', true, true, 40, '/features/multi-entity')
ON CONFLICT DO NOTHING;

-- Industry Solutions
INSERT INTO platform_settings (key, value) VALUES
('industry_solutions', '[
  {"name":"Healthcare","slug":"healthcare","description":"HIPAA-compliant patient management & billing","icon":"Heart","color":"hsl(0,72%,50%)"},
  {"name":"Education","slug":"education","description":"Student enrollment, LMS & campus management","icon":"GraduationCap","color":"hsl(243,75%,58%)"},
  {"name":"Manufacturing","slug":"manufacturing","description":"Production planning, QC & supply chain","icon":"Factory","color":"hsl(38,92%,50%)"},
  {"name":"Retail & eCommerce","slug":"retail","description":"POS, inventory & omnichannel commerce","icon":"ShoppingBag","color":"hsl(270,80%,60%)"},
  {"name":"Technology","slug":"technology","description":"Agile projects, DevOps & SaaS billing","icon":"Laptop","color":"hsl(199,89%,48%)"},
  {"name":"Financial Services","slug":"finance","description":"Compliance, risk management & reporting","icon":"Landmark","color":"hsl(142,71%,45%)"},
  {"name":"Hospitality","slug":"hospitality","description":"Reservations, guest management & F&B","icon":"Hotel","color":"hsl(30,80%,55%)"},
  {"name":"Construction","slug":"construction","description":"Project costing, subcontractor & safety","icon":"HardHat","color":"hsl(45,93%,47%)"},
  {"name":"Logistics","slug":"logistics","description":"Fleet management, routing & delivery tracking","icon":"Truck","color":"hsl(200,80%,50%)"},
  {"name":"Non-Profit","slug":"nonprofit","description":"Donor management, grants & volunteer tracking","icon":"HandHeart","color":"hsl(340,70%,55%)"}
]'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Subscription Plans (only if table is empty)
INSERT INTO subscription_plans (name, slug, price_monthly, price_yearly, price_quarterly, max_users, max_companies, features, is_active)
SELECT * FROM (VALUES
  ('Free', 'free', 0, 0, 0, 3, 1, '["5 modules","Basic reports","Email support","1 GB storage"]'::jsonb, true),
  ('Starter', 'starter', 29, 290, 80, 15, 1, '["All core modules","Advanced reports","Priority support","10 GB storage","API access"]'::jsonb, true),
  ('Professional', 'professional', 79, 790, 220, 50, 3, '["All modules","Custom dashboards","Phone support","50 GB storage","API + Webhooks","White labeling"]'::jsonb, true),
  ('Enterprise', 'enterprise', 199, 1990, 550, 500, 10, '["Everything in Professional","Dedicated support","Unlimited storage","Custom integrations","SLA guarantee"]'::jsonb, true)
) AS t(name, slug, price_monthly, price_yearly, price_quarterly, max_users, max_companies, features, is_active)
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans LIMIT 1);
