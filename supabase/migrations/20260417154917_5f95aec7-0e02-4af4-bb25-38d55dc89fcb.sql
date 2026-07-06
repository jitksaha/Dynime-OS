-- 1. Fuzzy matching extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Registry of searchable tables (extensible without code changes)
CREATE TABLE IF NOT EXISTS public.searchable_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  icon_name text NOT NULL DEFAULT 'file',
  route_template text,                -- e.g. '/accounting/invoices' or '/crm/deals/{id}'
  title_column text NOT NULL,         -- main searchable & displayed column
  subtitle_columns text[] DEFAULT '{}'::text[],  -- extra columns shown as subtitle
  search_columns text[] DEFAULT '{}'::text[],    -- additional columns to search
  is_tenant_scoped boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.searchable_tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can read registry" ON public.searchable_tables;
CREATE POLICY "Anyone authenticated can read registry"
  ON public.searchable_tables FOR SELECT
  TO authenticated USING (true);

-- 3. Seed registry with current core tables
INSERT INTO public.searchable_tables
  (table_name, display_name, icon_name, route_template, title_column, subtitle_columns, search_columns, sort_order)
VALUES
  ('employees',          'Employees',        'users',          '/hrm/employees',         'full_name',     ARRAY['job_title','department'], ARRAY['email'],            10),
  ('deals',              'Deals',            'target',         '/crm',                   'name',          ARRAY['contact_name','stage'],   ARRAY['contact_name'],     20),
  ('invoices',           'Invoices',         'file-text',      '/accounting/invoices',   'invoice_number',ARRAY['client','status'],        ARRAY['client'],           30),
  ('tickets',            'Tickets',          'headphones',     '/helpdesk',              'subject',       ARRAY['customer','status'],      ARRAY['customer'],         40),
  ('projects',           'Projects',         'folder-kanban',  '/projects',              'name',          ARRAY['status'],                 ARRAY['description'],      50),
  ('expenses',           'Expenses',         'wallet',         '/accounting/expenses',   'description',   ARRAY['category'],               ARRAY['category'],         60),
  ('documents',          'Documents',        'file-text',      '/documents',             'name',          ARRAY['doc_type'],               ARRAY[]::text[],           70),
  ('campaigns',          'Campaigns',        'megaphone',      '/marketing/campaigns',   'name',          ARRAY['channel','status'],       ARRAY[]::text[],           80),
  ('calendar_events',    'Calendar Events',  'calendar-days',  '/calendar',              'title',         ARRAY['event_type'],             ARRAY['description'],      90),
  ('budgets',            'Budgets',          'wallet',         '/accounting/budgets',    'name',          ARRAY['category','status'],      ARRAY[]::text[],          100),
  ('contracts',          'Contracts',        'file-check',     '/contracts',             'title',         ARRAY['client_name','status'],   ARRAY['contract_number'], 110),
  ('chat_channels',      'Chat Channels',    'message-square', '/team-chat',             'name',          ARRAY['description'],            ARRAY[]::text[],          120),
  ('booking_services',   'Booking Services', 'calendar-check', '/bookings',              'name',          ARRAY['description'],            ARRAY[]::text[],          130),
  ('company_assets',     'Assets',           'package',        '/assets',                'name',          ARRAY['category','status'],      ARRAY['serial_number'],   140),
  ('compliance_checklists','Compliance',     'shield-check',   '/compliance',            'title',         ARRAY['category','status'],      ARRAY['description'],     150)
ON CONFLICT (table_name) DO NOTHING;

-- 4. Result type
DROP FUNCTION IF EXISTS public.global_search(text, uuid, integer);

CREATE OR REPLACE FUNCTION public.global_search(
  _query text,
  _tenant_id uuid DEFAULT NULL,
  _limit int DEFAULT 5
)
RETURNS TABLE (
  source_table text,
  display_name text,
  record_id uuid,
  title text,
  subtitle text,
  icon_name text,
  route_pattern text,
  similarity real
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reg record;
  pattern text;
  sql text;
  subtitle_expr text;
  search_cols text;
BEGIN
  IF _query IS NULL OR length(trim(_query)) < 2 THEN
    RETURN;
  END IF;

  pattern := '%' || _query || '%';

  FOR reg IN
    SELECT * FROM public.searchable_tables
    WHERE is_active = true
    ORDER BY sort_order
  LOOP
    -- Build subtitle: concat non-null subtitle columns separated by ' · '
    IF array_length(reg.subtitle_columns, 1) > 0 THEN
      SELECT string_agg(format('COALESCE(%I::text, '''')', c), $S$ || ' · ' || $S$)
        INTO subtitle_expr
        FROM unnest(reg.subtitle_columns) c;
    ELSE
      subtitle_expr := '''''';
    END IF;

    -- Build OR-search across title_column + search_columns
    SELECT string_agg(format('%I::text ILIKE %L', c, pattern), ' OR ')
      INTO search_cols
      FROM unnest(ARRAY[reg.title_column] || reg.search_columns) c;

    sql := format($SQL$
      SELECT
        %L::text                                       AS source_table,
        %L::text                                       AS display_name,
        t.id::uuid                                     AS record_id,
        t.%I::text                                     AS title,
        (%s)::text                                     AS subtitle,
        %L::text                                       AS icon_name,
        %L::text                                       AS route_pattern,
        GREATEST(
          similarity(coalesce(t.%I::text, ''), %L),
          CASE WHEN t.%I::text ILIKE %L THEN 0.4 ELSE 0 END
        )::real                                        AS similarity
      FROM public.%I t
      WHERE (%s)
        %s
      ORDER BY similarity DESC NULLS LAST
      LIMIT %s
    $SQL$,
      reg.table_name, reg.display_name,
      reg.title_column, subtitle_expr,
      reg.icon_name, reg.route_template,
      reg.title_column, _query,
      reg.title_column, pattern,
      reg.table_name,
      search_cols,
      CASE WHEN reg.is_tenant_scoped AND _tenant_id IS NOT NULL
           THEN format('AND t.tenant_id = %L', _tenant_id)
           ELSE '' END,
      _limit
    );

    BEGIN
      RETURN QUERY EXECUTE sql;
    EXCEPTION WHEN OTHERS THEN
      -- Skip tables that don't have expected columns; keep search resilient
      CONTINUE;
    END;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.global_search(text, uuid, integer) TO authenticated, anon;