
-- Add missing SQL helper functions for better export capabilities

-- Get indexes for all tables
CREATE OR REPLACE FUNCTION public.get_db_indexes()
RETURNS TABLE(index_name text, table_name text, index_definition text, is_unique boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    i.relname::text AS index_name,
    t.relname::text AS table_name,
    pg_get_indexdef(i.oid)::text AS index_definition,
    ix.indisunique AS is_unique
  FROM pg_index ix
  JOIN pg_class i ON i.oid = ix.indexrelid
  JOIN pg_class t ON t.oid = ix.indrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND NOT ix.indisprimary
  ORDER BY t.relname, i.relname;
$function$;

-- Get foreign key constraints
CREATE OR REPLACE FUNCTION public.get_db_constraints()
RETURNS TABLE(constraint_name text, table_name text, constraint_type text, constraint_definition text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    c.conname::text AS constraint_name,
    rel.relname::text AS table_name,
    CASE c.contype
      WHEN 'f' THEN 'FOREIGN KEY'
      WHEN 'u' THEN 'UNIQUE'
      WHEN 'c' THEN 'CHECK'
      WHEN 'p' THEN 'PRIMARY KEY'
    END::text AS constraint_type,
    pg_get_constraintdef(c.oid)::text AS constraint_definition
  FROM pg_constraint c
  JOIN pg_class rel ON rel.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = rel.relnamespace
  WHERE n.nspname = 'public'
  ORDER BY rel.relname, c.conname;
$function$;

-- Get custom enum types
CREATE OR REPLACE FUNCTION public.get_db_enums()
RETURNS TABLE(enum_name text, enum_values text[])
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    t.typname::text AS enum_name,
    ARRAY(
      SELECT e.enumlabel::text
      FROM pg_enum e
      WHERE e.enumtypid = t.oid
      ORDER BY e.enumsortorder
    ) AS enum_values
  FROM pg_type t
  JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE t.typtype = 'e'
    AND n.nspname = 'public'
  ORDER BY t.typname;
$function$;

-- Get table row counts accurately
CREATE OR REPLACE FUNCTION public.get_table_row_counts()
RETURNS TABLE(table_name text, exact_count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN 
    SELECT c.relname::text AS name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname
  LOOP
    table_name := rec.name;
    EXECUTE format('SELECT count(*) FROM public.%I', rec.name) INTO exact_count;
    RETURN NEXT;
  END LOOP;
END;
$function$;

-- Get storage policies  
CREATE OR REPLACE FUNCTION public.get_storage_policies()
RETURNS TABLE(policy_name text, bucket_id text, policy_command text, policy_roles text[], policy_qual text, policy_with_check text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    policyname::text AS policy_name,
    tablename::text AS bucket_id,
    cmd::text AS policy_command,
    roles::text[] AS policy_roles,
    qual::text AS policy_qual,
    with_check::text AS policy_with_check
  FROM pg_policies
  WHERE schemaname = 'storage'
  ORDER BY tablename, policyname;
$function$;
