DROP FUNCTION IF EXISTS public.get_table_columns(text);

CREATE OR REPLACE FUNCTION public.get_table_columns(p_table_name text)
 RETURNS TABLE(column_name text, data_type text, is_nullable text, column_default text, character_maximum_length integer, udt_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text,
    c.column_default::text,
    c.character_maximum_length::integer,
    c.udt_name::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = p_table_name
  ORDER BY c.ordinal_position;
$function$