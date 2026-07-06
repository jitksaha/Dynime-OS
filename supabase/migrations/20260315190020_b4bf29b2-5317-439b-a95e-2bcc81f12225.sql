
-- Search registry: defines which tables/columns are searchable
CREATE TABLE public.search_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  search_columns text[] NOT NULL,
  title_column text NOT NULL,
  subtitle_column text,
  icon_name text DEFAULT 'file',
  route_pattern text,
  tenant_scoped boolean DEFAULT true,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.search_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read search registry"
ON public.search_registry FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins can manage search registry"
ON public.search_registry FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Seed all existing tables
INSERT INTO public.search_registry (table_name, display_name, search_columns, title_column, subtitle_column, icon_name, route_pattern, tenant_scoped, sort_order) VALUES
('profiles', 'Users', ARRAY['full_name', 'email', 'department', 'job_title'], 'full_name', 'email', 'users', '/superadmin/users', true, 1),
('tenants', 'Companies', ARRAY['name', 'slug', 'industry'], 'name', 'industry', 'building-2', '/superadmin/tenants', false, 2),
('blog_posts', 'Blog Posts', ARRAY['title', 'excerpt', 'category'], 'title', 'category', 'file-text', '/superadmin/blog', false, 3),
('campaigns', 'Campaigns', ARRAY['name', 'channel', 'status'], 'name', 'channel', 'megaphone', NULL, true, 4),
('contracts', 'Contracts', ARRAY['title', 'party_name', 'status'], 'title', 'party_name', 'file-check', NULL, true, 5),
('bookings', 'Bookings', ARRAY['title', 'attendee_name', 'attendee_email'], 'title', 'attendee_name', 'calendar-check', NULL, true, 6),
('calendar_events', 'Events', ARRAY['title', 'description', 'location'], 'title', 'location', 'calendar-days', NULL, true, 7),
('company_assets', 'Assets', ARRAY['asset_name', 'serial_number', 'asset_type'], 'asset_name', 'asset_type', 'package', NULL, true, 8),
('chat_channels', 'Chat Channels', ARRAY['name', 'description'], 'name', 'description', 'message-square', NULL, true, 9),
('attendance_records', 'Attendance', ARRAY['employee_name', 'status'], 'employee_name', 'status', 'clock', NULL, true, 10),
('budgets', 'Budgets', ARRAY['name', 'category', 'status'], 'name', 'category', 'wallet', NULL, true, 11),
('compliance_checklists', 'Compliance', ARRAY['title', 'category', 'regulation'], 'title', 'category', 'shield-check', NULL, true, 12),
('communication_templates', 'Templates', ARRAY['name', 'category', 'channel'], 'name', 'category', 'mail', NULL, true, 13),
('approval_workflows', 'Workflows', ARRAY['name', 'description', 'module'], 'name', 'module', 'git-branch', NULL, true, 14),
('platform_modules', 'Modules', ARRAY['name', 'label', 'description'], 'label', 'description', 'layers', '/superadmin/modules', false, 15),
('booking_services', 'Services', ARRAY['name', 'description'], 'name', 'description', 'briefcase', NULL, true, 16),
('company_holidays', 'Holidays', ARRAY['name', 'description'], 'name', 'description', 'palm-tree', NULL, true, 17),
('ai_conversations', 'AI Chats', ARRAY['title'], 'title', NULL, 'bot', NULL, true, 18),
('contact_submissions', 'Contact Forms', ARRAY['name', 'email', 'subject'], 'subject', 'name', 'inbox', '/superadmin/contact-submissions', false, 19),
('audit_logs', 'Audit Logs', ARRAY['action', 'resource_type'], 'action', 'resource_type', 'scroll-text', '/superadmin/audit-logs', false, 20);

-- Dynamic global search function
CREATE OR REPLACE FUNCTION public.global_search(_query text, _tenant_id uuid DEFAULT NULL, _limit integer DEFAULT 5)
RETURNS TABLE(
  source_table text,
  display_name text,
  record_id text,
  title text,
  subtitle text,
  icon_name text,
  route_pattern text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _reg record;
  _sql text;
  _search_condition text;
  _subtitle_expr text;
BEGIN
  FOR _reg IN 
    SELECT * FROM public.search_registry WHERE is_active = true ORDER BY sort_order
  LOOP
    -- Build ILIKE condition across all search columns
    _search_condition := '';
    FOR i IN 1..array_length(_reg.search_columns, 1) LOOP
      IF i > 1 THEN _search_condition := _search_condition || ' OR '; END IF;
      _search_condition := _search_condition || format('COALESCE(%I::text, '''') ILIKE $1', _reg.search_columns[i]);
    END LOOP;

    -- Handle subtitle column
    IF _reg.subtitle_column IS NOT NULL THEN
      _subtitle_expr := format('COALESCE(%I::text, '''')', _reg.subtitle_column);
    ELSE
      _subtitle_expr := '''''::text';
    END IF;

    _sql := format(
      'SELECT %L::text, %L::text, id::text, COALESCE(%I::text, '''')::text, %s::text, %L::text, %L::text FROM public.%I WHERE (%s)',
      _reg.table_name,
      _reg.display_name,
      _reg.title_column,
      _subtitle_expr,
      _reg.icon_name,
      _reg.route_pattern,
      _reg.table_name,
      _search_condition
    );

    -- Tenant scoping
    IF _reg.tenant_scoped AND _tenant_id IS NOT NULL THEN
      _sql := _sql || format(' AND tenant_id = %L', _tenant_id);
    END IF;

    _sql := _sql || format(' LIMIT %s', _limit);

    BEGIN
      RETURN QUERY EXECUTE _sql USING '%' || _query || '%';
    EXCEPTION WHEN OTHERS THEN
      NULL; -- Skip erroring tables gracefully
    END;
  END LOOP;
END;
$$;
