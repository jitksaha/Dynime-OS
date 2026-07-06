
-- =============================================
-- MIGRATION: Create all missing tables (86 tables + functions)
-- =============================================

-- 1. partners
CREATE TABLE IF NOT EXISTS public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  tier TEXT NOT NULL DEFAULT 'standard',
  description TEXT,
  short_description TEXT,
  logo_url TEXT,
  website TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  country TEXT,
  social_links JSONB DEFAULT '{}',
  services JSONB DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. partner_applications
CREATE TABLE IF NOT EXISTS public.partner_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  website TEXT,
  category TEXT DEFAULT 'other',
  services JSONB DEFAULT '[]',
  description TEXT,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. blog_categories
CREATE TABLE IF NOT EXISTS public.blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. blog_posts
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT,
  excerpt TEXT,
  cover_image TEXT,
  author_name TEXT,
  author_avatar TEXT,
  category_id UUID REFERENCES public.blog_categories(id),
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  meta_title TEXT,
  meta_description TEXT,
  reading_time INT DEFAULT 0,
  views INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ai_conversations
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  user_id UUID NOT NULL,
  title TEXT DEFAULT 'New Conversation',
  model TEXT DEFAULT 'gpt-4',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. ai_messages
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  role TEXT NOT NULL DEFAULT 'user',
  content TEXT NOT NULL,
  tokens_used INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. ai_prompt_library
CREATE TABLE IF NOT EXISTS public.ai_prompt_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  usage_count INT DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. ai_usage_logs
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  user_id UUID NOT NULL,
  feature TEXT NOT NULL,
  model TEXT,
  tokens_input INT DEFAULT 0,
  tokens_output INT DEFAULT 0,
  cost NUMERIC(10,6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. chat_channel_members
CREATE TABLE IF NOT EXISTS public.chat_channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

-- 10. chat_reactions
CREATE TABLE IF NOT EXISTS public.chat_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- 11. user_presence
CREATE TABLE IF NOT EXISTS public.user_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  tenant_id UUID REFERENCES public.tenants(id),
  status TEXT DEFAULT 'offline',
  last_seen TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 12. live_chat_conversations
CREATE TABLE IF NOT EXISTS public.live_chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  visitor_name TEXT,
  visitor_email TEXT,
  subject TEXT,
  status TEXT DEFAULT 'open',
  assigned_to UUID,
  priority TEXT DEFAULT 'normal',
  channel TEXT DEFAULT 'web',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 13. live_chat_messages
CREATE TABLE IF NOT EXISTS public.live_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.live_chat_conversations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  sender_type TEXT NOT NULL DEFAULT 'visitor',
  sender_id UUID,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. project_tasks
CREATE TABLE IF NOT EXISTS public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',
  priority TEXT DEFAULT 'medium',
  assigned_to UUID,
  assigned_name TEXT,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  sort_order INT DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 15. project_activities
CREATE TABLE IF NOT EXISTS public.project_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  user_id UUID,
  user_name TEXT,
  action TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 16. project_milestones
CREATE TABLE IF NOT EXISTS public.project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 17. project_crm_links
CREATE TABLE IF NOT EXISTS public.project_crm_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, deal_id)
);

-- 18. teams
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  lead_id UUID,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 19. team_members
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- 20. staff_tasks
CREATE TABLE IF NOT EXISTS public.staff_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID,
  assigned_name TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 21. abandoned_carts
CREATE TABLE IF NOT EXISTS public.abandoned_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  user_id UUID,
  email TEXT,
  cart_data JSONB DEFAULT '{}',
  total_value NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'abandoned',
  recovery_status TEXT DEFAULT 'none',
  abandoned_at TIMESTAMPTZ DEFAULT now(),
  recovered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 22. cart_recovery_logs
CREATE TABLE IF NOT EXISTS public.cart_recovery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.abandoned_carts(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  action TEXT NOT NULL,
  channel TEXT DEFAULT 'email',
  status TEXT DEFAULT 'sent',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 23. cart_recovery_offers
CREATE TABLE IF NOT EXISTS public.cart_recovery_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  discount_type TEXT DEFAULT 'percentage',
  discount_value NUMERIC(10,2) DEFAULT 0,
  min_cart_value NUMERIC(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_after_hours INT DEFAULT 24,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 24. country_payment_methods
CREATE TABLE IF NOT EXISTS public.country_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL,
  gateway_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 25. country_addon_prices
CREATE TABLE IF NOT EXISTS public.country_addon_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  addon_id UUID REFERENCES public.module_addons(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_yearly NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 26. country_plan_prices
CREATE TABLE IF NOT EXISTS public.country_plan_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_quarterly NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_yearly NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 27. loyalty_points
CREATE TABLE IF NOT EXISTS public.loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  user_id UUID NOT NULL,
  balance INT DEFAULT 0,
  lifetime_earned INT DEFAULT 0,
  tier TEXT DEFAULT 'bronze',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- 28. loyalty_transactions
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  user_id UUID NOT NULL,
  points INT NOT NULL,
  type TEXT NOT NULL DEFAULT 'earn',
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 29. pos_configurations
CREATE TABLE IF NOT EXISTS public.pos_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) UNIQUE,
  terminal_name TEXT DEFAULT 'Main Terminal',
  receipt_header TEXT,
  receipt_footer TEXT,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 30. leave_balances
CREATE TABLE IF NOT EXISTS public.leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL,
  total_days NUMERIC(5,1) DEFAULT 0,
  used_days NUMERIC(5,1) DEFAULT 0,
  remaining_days NUMERIC(5,1) DEFAULT 0,
  year INT DEFAULT EXTRACT(YEAR FROM now()),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 31. employee_expense_claims
CREATE TABLE IF NOT EXISTS public.employee_expense_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  employee_id UUID REFERENCES public.employees(id),
  employee_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  category TEXT DEFAULT 'general',
  receipt_url TEXT,
  status TEXT DEFAULT 'pending',
  submitted_at TIMESTAMPTZ DEFAULT now(),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 32. employee_surveys
CREATE TABLE IF NOT EXISTS public.employee_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  is_anonymous BOOLEAN DEFAULT true,
  response_count INT DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 33. survey_responses
CREATE TABLE IF NOT EXISTS public.survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.employee_surveys(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  respondent_id UUID,
  answers JSONB DEFAULT '{}',
  submitted_at TIMESTAMPTZ DEFAULT now()
);

-- 34. training_courses
CREATE TABLE IF NOT EXISTS public.training_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  duration_hours NUMERIC(5,1) DEFAULT 0,
  instructor TEXT,
  content_url TEXT,
  is_mandatory BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 35. training_enrollments
CREATE TABLE IF NOT EXISTS public.training_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  employee_id UUID REFERENCES public.employees(id),
  employee_name TEXT,
  status TEXT DEFAULT 'enrolled',
  progress INT DEFAULT 0,
  completed_at TIMESTAMPTZ,
  enrolled_at TIMESTAMPTZ DEFAULT now()
);

-- 36. objectives
CREATE TABLE IF NOT EXISTS public.objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID,
  owner_name TEXT,
  status TEXT DEFAULT 'on_track',
  progress INT DEFAULT 0,
  start_date DATE,
  end_date DATE,
  parent_id UUID REFERENCES public.objectives(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 37. key_results
CREATE TABLE IF NOT EXISTS public.key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES public.objectives(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  title TEXT NOT NULL,
  metric_type TEXT DEFAULT 'number',
  target_value NUMERIC(12,2) DEFAULT 0,
  current_value NUMERIC(12,2) DEFAULT 0,
  unit TEXT,
  status TEXT DEFAULT 'on_track',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 38. platform_modules
CREATE TABLE IF NOT EXISTS public.platform_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT DEFAULT 'core',
  is_active BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  route TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 39. sidebar_menu_configs
CREATE TABLE IF NOT EXISTS public.sidebar_menu_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_type TEXT NOT NULL DEFAULT 'main',
  menu_items JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 40. section_access_rules
CREATE TABLE IF NOT EXISTS public.section_access_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL,
  role TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 41. tenant_usage_counters
CREATE TABLE IF NOT EXISTS public.tenant_usage_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  counter_key TEXT NOT NULL,
  current_count INT DEFAULT 0,
  billing_cycle TEXT DEFAULT 'monthly',
  cycle_start TIMESTAMPTZ DEFAULT now(),
  cycle_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, counter_key)
);

-- 42. tenant_app_connections
CREATE TABLE IF NOT EXISTS public.tenant_app_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  app_key TEXT NOT NULL,
  app_name TEXT NOT NULL,
  status TEXT DEFAULT 'connected',
  config JSONB DEFAULT '{}',
  connected_by UUID,
  connected_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 43. tenant_sms_balances
CREATE TABLE IF NOT EXISTS public.tenant_sms_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) UNIQUE,
  balance NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 44. tenant_sms_gateway_configs
CREATE TABLE IF NOT EXISTS public.tenant_sms_gateway_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  gateway_key TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 45. user_favorites
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_label TEXT,
  item_path TEXT,
  item_icon TEXT,
  item_description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 46. user_preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  tenant_id UUID REFERENCES public.tenants(id),
  theme TEXT DEFAULT 'system',
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'UTC',
  notifications_enabled BOOLEAN DEFAULT true,
  compact_mode BOOLEAN DEFAULT false,
  preferences JSONB DEFAULT '{}',
  theme_mode TEXT DEFAULT 'system',
  auto_theme BOOLEAN DEFAULT false,
  theme_schedule JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 47. user_passkeys
CREATE TABLE IF NOT EXISTS public.user_passkeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  device_name TEXT,
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 48. social_signin_providers
CREATE TABLE IF NOT EXISTS public.social_signin_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key TEXT NOT NULL UNIQUE,
  provider_name TEXT NOT NULL,
  icon TEXT,
  is_enabled BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 49. social_linked_accounts
CREATE TABLE IF NOT EXISTS public.social_linked_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider_key TEXT NOT NULL,
  provider_user_id TEXT,
  provider_email TEXT,
  linked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, provider_key)
);

-- 50. staff_account_settings
CREATE TABLE IF NOT EXISTS public.staff_account_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  role TEXT DEFAULT 'staff',
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 51. contracts
CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  title TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  contract_number TEXT,
  value NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  signed_at TIMESTAMPTZ,
  file_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 52. inventory_items
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  sku TEXT,
  description TEXT,
  category TEXT,
  quantity INT DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  unit_price NUMERIC(12,2) DEFAULT 0,
  reorder_level INT DEFAULT 0,
  location TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 53. purchase_orders
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  po_number TEXT NOT NULL,
  vendor_name TEXT,
  vendor_id UUID,
  total_amount NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'draft',
  order_date DATE DEFAULT CURRENT_DATE,
  delivery_date DATE,
  items JSONB DEFAULT '[]',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 54. vehicles
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  registration_number TEXT NOT NULL,
  make TEXT,
  model TEXT,
  year INT,
  type TEXT DEFAULT 'car',
  status TEXT DEFAULT 'active',
  assigned_driver TEXT,
  mileage INT DEFAULT 0,
  last_service_date DATE,
  next_service_date DATE,
  insurance_expiry DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 55. delivery_routes
CREATE TABLE IF NOT EXISTS public.delivery_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id),
  driver_name TEXT,
  status TEXT DEFAULT 'planned',
  stops JSONB DEFAULT '[]',
  distance_km NUMERIC(10,2) DEFAULT 0,
  estimated_time_min INT DEFAULT 0,
  scheduled_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 56. facility_bookings
CREATE TABLE IF NOT EXISTS public.facility_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  facility_name TEXT NOT NULL,
  booked_by UUID,
  booked_by_name TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  purpose TEXT,
  status TEXT DEFAULT 'confirmed',
  attendees INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 57. maintenance_requests
CREATE TABLE IF NOT EXISTS public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  category TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  reported_by UUID,
  reported_by_name TEXT,
  assigned_to TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 58. incidents
CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  category TEXT DEFAULT 'general',
  reported_by UUID,
  reported_by_name TEXT,
  assigned_to TEXT,
  resolved_at TIMESTAMPTZ,
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 59. risk_register
CREATE TABLE IF NOT EXISTS public.risk_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'operational',
  likelihood TEXT DEFAULT 'medium',
  impact TEXT DEFAULT 'medium',
  risk_score INT DEFAULT 0,
  status TEXT DEFAULT 'open',
  owner_name TEXT,
  mitigation TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 60. compliance_checklists
CREATE TABLE IF NOT EXISTS public.compliance_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  items JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  due_date DATE,
  assigned_to TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 61. company_assets
CREATE TABLE IF NOT EXISTS public.company_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  asset_tag TEXT,
  category TEXT DEFAULT 'equipment',
  description TEXT,
  status TEXT DEFAULT 'available',
  assigned_to UUID,
  assigned_to_name TEXT,
  purchase_date DATE,
  purchase_price NUMERIC(12,2),
  location TEXT,
  serial_number TEXT,
  warranty_expiry DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 62. sms_balance_transactions
CREATE TABLE IF NOT EXISTS public.sms_balance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  amount NUMERIC(12,2) NOT NULL,
  type TEXT NOT NULL DEFAULT 'credit',
  description TEXT,
  reference_id TEXT,
  balance_after NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 63. sms_pricing
CREATE TABLE IF NOT EXISTS public.sms_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL,
  country_name TEXT,
  price_per_sms NUMERIC(10,4) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  gateway_key TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 64. sms_templates
CREATE TABLE IF NOT EXISTS public.sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  variables JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 65. whatsapp_gateway_configs
CREATE TABLE IF NOT EXISTS public.whatsapp_gateway_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider TEXT DEFAULT 'twilio',
  api_endpoint TEXT,
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 66. whatsapp_logs
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  recipient TEXT NOT NULL,
  template_name TEXT,
  content TEXT,
  status TEXT DEFAULT 'sent',
  gateway_id UUID REFERENCES public.whatsapp_gateway_configs(id),
  error_message TEXT,
  cost NUMERIC(10,4) DEFAULT 0,
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- 67. whatsapp_templates
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT DEFAULT 'utility',
  language TEXT DEFAULT 'en',
  variables JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 68. knowledge_base_articles
CREATE TABLE IF NOT EXISTS public.knowledge_base_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  title TEXT NOT NULL,
  slug TEXT,
  content TEXT,
  category TEXT DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'draft',
  author_id UUID,
  author_name TEXT,
  views INT DEFAULT 0,
  helpful_count INT DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 69. cdn_configurations
CREATE TABLE IF NOT EXISTS public.cdn_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider TEXT DEFAULT 'cloudflare',
  domain TEXT,
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 70. custom_code_snippets
CREATE TABLE IF NOT EXISTS public.custom_code_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  location TEXT DEFAULT 'head',
  is_active BOOLEAN DEFAULT true,
  pages TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 71. exchange_rate_cache
CREATE TABLE IF NOT EXISTS public.exchange_rate_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  rate NUMERIC(16,8) NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(base_currency, target_currency)
);

-- 72. gateway_health_logs
CREATE TABLE IF NOT EXISTS public.gateway_health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_key TEXT NOT NULL,
  status TEXT DEFAULT 'healthy',
  response_time_ms INT,
  error_message TEXT,
  checked_at TIMESTAMPTZ DEFAULT now()
);

-- 73. gdpr_export_requests
CREATE TABLE IF NOT EXISTS public.gdpr_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  status TEXT DEFAULT 'pending',
  export_url TEXT,
  requested_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 74. integration_apps
CREATE TABLE IF NOT EXISTS public.integration_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT DEFAULT 'general',
  provider TEXT,
  is_active BOOLEAN DEFAULT true,
  config_schema JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 75. ip_whitelist
CREATE TABLE IF NOT EXISTS public.ip_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  ip_address TEXT NOT NULL,
  label TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 76. tax_calculations
CREATE TABLE IF NOT EXISTS public.tax_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  invoice_id UUID,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  tax_profile_id UUID REFERENCES public.tax_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 77. tax_compliance_records
CREATE TABLE IF NOT EXISTS public.tax_compliance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  period TEXT NOT NULL,
  jurisdiction TEXT,
  total_tax_collected NUMERIC(12,2) DEFAULT 0,
  total_tax_remitted NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  filed_at TIMESTAMPTZ,
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 78-84. Tracking tables
CREATE TABLE IF NOT EXISTS public.tracking_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) UNIQUE,
  screenshot_interval INT DEFAULT 300,
  idle_timeout INT DEFAULT 300,
  track_apps BOOLEAN DEFAULT true,
  track_urls BOOLEAN DEFAULT true,
  blur_screenshots BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tracking_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  budget_hours NUMERIC(10,2),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tracking_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.tracking_projects(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  assigned_to UUID,
  estimated_hours NUMERIC(10,2),
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tracking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  user_id UUID NOT NULL,
  task_id UUID REFERENCES public.tracking_tasks(id),
  project_id UUID REFERENCES public.tracking_projects(id),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INT DEFAULT 0,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tracking_screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.tracking_sessions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  screenshot_url TEXT,
  activity_level INT DEFAULT 0,
  active_app TEXT,
  active_url TEXT,
  captured_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tracking_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.tracking_sessions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  activity_type TEXT NOT NULL,
  app_name TEXT,
  window_title TEXT,
  url TEXT,
  duration_seconds INT DEFAULT 0,
  logged_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tracking_time_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.tracking_sessions(id),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  user_id UUID NOT NULL,
  original_duration INT,
  corrected_duration INT,
  reason TEXT,
  approved_by UUID,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 85. vendors
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  category TEXT,
  payment_terms TEXT DEFAULT 'net30',
  tax_id TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 86. zapier_templates
CREATE TABLE IF NOT EXISTS public.zapier_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_app TEXT,
  action_app TEXT,
  template_url TEXT,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- DATABASE FUNCTIONS
-- =============================================

-- check_usage_limit function
CREATE OR REPLACE FUNCTION public.check_usage_limit(_tenant_id UUID, _counter_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _counter RECORD;
  _limit INT;
  _result JSONB;
BEGIN
  SELECT * INTO _counter FROM public.tenant_usage_counters
  WHERE tenant_id = _tenant_id AND counter_key = _counter_key;

  SELECT limit_value INTO _limit FROM public.free_plan_limits
  WHERE limit_key = _counter_key LIMIT 1;

  IF _limit IS NULL THEN _limit := 999999; END IF;

  _result := jsonb_build_object(
    'allowed', COALESCE(_counter.current_count, 0) < _limit,
    'current', COALESCE(_counter.current_count, 0),
    'limit', _limit,
    'remaining', GREATEST(_limit - COALESCE(_counter.current_count, 0), 0),
    'billing_cycle', COALESCE(_counter.billing_cycle, 'monthly'),
    'cycle_end', _counter.cycle_end
  );

  RETURN _result;
END;
$$;

-- increment_usage_counter function
CREATE OR REPLACE FUNCTION public.increment_usage_counter(_tenant_id UUID, _counter_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _counter RECORD;
  _limit INT;
  _new_count INT;
  _result JSONB;
BEGIN
  SELECT limit_value INTO _limit FROM public.free_plan_limits
  WHERE limit_key = _counter_key LIMIT 1;

  IF _limit IS NULL THEN _limit := 999999; END IF;

  SELECT * INTO _counter FROM public.tenant_usage_counters
  WHERE tenant_id = _tenant_id AND counter_key = _counter_key;

  IF _counter IS NULL THEN
    INSERT INTO public.tenant_usage_counters (tenant_id, counter_key, current_count)
    VALUES (_tenant_id, _counter_key, 0);
    _new_count := 0;
  ELSE
    _new_count := _counter.current_count;
  END IF;

  IF _new_count >= _limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'current', _new_count,
      'limit', _limit,
      'message', format('You have reached your %s limit (%s/%s). Please upgrade your plan.', _counter_key, _new_count, _limit)
    );
  END IF;

  UPDATE public.tenant_usage_counters
  SET current_count = current_count + 1, updated_at = now()
  WHERE tenant_id = _tenant_id AND counter_key = _counter_key;

  _new_count := _new_count + 1;

  RETURN jsonb_build_object(
    'allowed', true,
    'current', _new_count,
    'limit', _limit,
    'message', null
  );
END;
$$;

-- add_sms_credits function
CREATE OR REPLACE FUNCTION public.add_sms_credits(_tenant_id UUID, _amount NUMERIC, _description TEXT DEFAULT 'Credit purchase')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_balance NUMERIC;
BEGIN
  INSERT INTO public.tenant_sms_balances (tenant_id, balance)
  VALUES (_tenant_id, _amount)
  ON CONFLICT (tenant_id) DO UPDATE
  SET balance = tenant_sms_balances.balance + _amount, updated_at = now();

  SELECT balance INTO _new_balance FROM public.tenant_sms_balances WHERE tenant_id = _tenant_id;

  INSERT INTO public.sms_balance_transactions (tenant_id, amount, type, description, balance_after)
  VALUES (_tenant_id, _amount, 'credit', _description, _new_balance);

  RETURN jsonb_build_object('success', true, 'new_balance', _new_balance);
END;
$$;

-- Add columns to existing tables that are missing
DO $$
BEGIN
  -- Add modules column to subscription_plans if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'modules') THEN
    ALTER TABLE public.subscription_plans ADD COLUMN modules JSONB DEFAULT '[]';
  END IF;

  -- Add price_quarterly to subscription_plans if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'price_quarterly') THEN
    ALTER TABLE public.subscription_plans ADD COLUMN price_quarterly NUMERIC(10,2) DEFAULT 0;
  END IF;

  -- Add payment_type to tenant_addon_modules if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_addon_modules' AND column_name = 'payment_type') THEN
    ALTER TABLE public.tenant_addon_modules ADD COLUMN payment_type TEXT DEFAULT 'subscription';
  END IF;

  -- Add phone_verified to profiles if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone_verified') THEN
    ALTER TABLE public.profiles ADD COLUMN phone_verified BOOLEAN DEFAULT false;
  END IF;

  -- Add last_message_at to chat_channels if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_channels' AND column_name = 'last_message_at') THEN
    ALTER TABLE public.chat_channels ADD COLUMN last_message_at TIMESTAMPTZ;
  END IF;

  -- Add is_active to active_sessions if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'active_sessions' AND column_name = 'is_active') THEN
    ALTER TABLE public.active_sessions ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;

  -- Add next_follow_up to deals if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'next_follow_up') THEN
    ALTER TABLE public.deals ADD COLUMN next_follow_up TIMESTAMPTZ;
  END IF;

  -- Add status to lead_follow_ups if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_follow_ups' AND column_name = 'status') THEN
    ALTER TABLE public.lead_follow_ups ADD COLUMN status TEXT DEFAULT 'pending';
  END IF;

  -- Add notes/follow_up_date to lead_follow_ups if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_follow_ups' AND column_name = 'notes') THEN
    ALTER TABLE public.lead_follow_ups ADD COLUMN notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_follow_ups' AND column_name = 'follow_up_date') THEN
    ALTER TABLE public.lead_follow_ups ADD COLUMN follow_up_date TIMESTAMPTZ;
  END IF;

  -- Add read/module/priority/snoozed_until/group_key to notifications if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'read') THEN
    ALTER TABLE public.notifications ADD COLUMN read BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'module') THEN
    ALTER TABLE public.notifications ADD COLUMN module TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'priority') THEN
    ALTER TABLE public.notifications ADD COLUMN priority TEXT DEFAULT 'normal';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'snoozed_until') THEN
    ALTER TABLE public.notifications ADD COLUMN snoozed_until TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'group_key') THEN
    ALTER TABLE public.notifications ADD COLUMN group_key TEXT;
  END IF;
END $$;
