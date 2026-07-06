
-- Function to export RLS policies
CREATE OR REPLACE FUNCTION public.get_rls_policies()
RETURNS TABLE(table_name text, policy_name text, policy_command text, policy_roles text[], policy_qual text, policy_with_check text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    schemaname || '.' || tablename as table_name,
    policyname as policy_name,
    cmd::text as policy_command,
    roles::text[] as policy_roles,
    qual::text as policy_qual,
    with_check::text as policy_with_check
  FROM pg_policies
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname;
$$;

-- Function to export database functions
CREATE OR REPLACE FUNCTION public.get_db_functions()
RETURNS TABLE(function_name text, function_args text, return_type text, function_definition text, function_language text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.proname::text as function_name,
    pg_get_function_arguments(p.oid)::text as function_args,
    pg_get_function_result(p.oid)::text as return_type,
    pg_get_functiondef(p.oid)::text as function_definition,
    l.lanname::text as function_language
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  JOIN pg_language l ON p.prolang = l.oid
  WHERE n.nspname = 'public'
  ORDER BY p.proname;
$$;

-- Function to export triggers
CREATE OR REPLACE FUNCTION public.get_db_triggers()
RETURNS TABLE(trigger_name text, event_manipulation text, event_object_table text, action_statement text, action_timing text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    trigger_name::text,
    event_manipulation::text,
    event_object_table::text,
    action_statement::text,
    action_timing::text
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'
  ORDER BY event_object_table, trigger_name;
$$;

-- Function to export extensions
CREATE OR REPLACE FUNCTION public.get_db_extensions()
RETURNS TABLE(ext_name text, ext_version text, ext_schema text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    e.extname::text as ext_name,
    e.extversion::text as ext_version,
    n.nspname::text as ext_schema
  FROM pg_extension e
  JOIN pg_namespace n ON e.extnamespace = n.oid
  ORDER BY e.extname;
$$;
