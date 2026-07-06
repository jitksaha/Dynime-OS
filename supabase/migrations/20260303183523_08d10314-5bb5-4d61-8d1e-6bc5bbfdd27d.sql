
-- Generic audit log trigger function
CREATE OR REPLACE FUNCTION public.fn_audit_log_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id uuid;
  _action text;
  _details jsonb;
  _resource_id text;
  _user_id uuid;
BEGIN
  -- Determine action
  _action := TG_OP;
  
  -- Get tenant_id and resource_id
  IF TG_OP = 'DELETE' THEN
    _tenant_id := OLD.tenant_id;
    _resource_id := OLD.id::text;
    _details := jsonb_build_object('old', to_jsonb(OLD));
  ELSE
    _tenant_id := NEW.tenant_id;
    _resource_id := NEW.id::text;
    IF TG_OP = 'UPDATE' THEN
      _details := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
    ELSE
      _details := jsonb_build_object('new', to_jsonb(NEW));
    END IF;
  END IF;

  -- Try to get user_id from created_by or auth.uid()
  BEGIN
    IF TG_OP = 'DELETE' THEN
      _user_id := auth.uid();
    ELSE
      _user_id := COALESCE(
        CASE WHEN NEW.created_by IS NOT NULL THEN NEW.created_by::uuid ELSE NULL END,
        auth.uid()
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    _user_id := auth.uid();
  END;

  INSERT INTO public.audit_logs (action, module, resource_type, resource_id, tenant_id, user_id, details)
  VALUES (_action, TG_TABLE_NAME, TG_TABLE_NAME, _resource_id, _tenant_id, _user_id, _details);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers for key tables
CREATE TRIGGER trg_audit_employees
  AFTER INSERT OR UPDATE OR DELETE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger();

CREATE TRIGGER trg_audit_deals
  AFTER INSERT OR UPDATE OR DELETE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger();

CREATE TRIGGER trg_audit_invoices
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger();

CREATE TRIGGER trg_audit_expenses
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger();

CREATE TRIGGER trg_audit_attendance_records
  AFTER INSERT OR UPDATE OR DELETE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger();

CREATE TRIGGER trg_audit_documents
  AFTER INSERT OR UPDATE OR DELETE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger();

CREATE TRIGGER trg_audit_projects
  AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger();

CREATE TRIGGER trg_audit_campaigns
  AFTER INSERT OR UPDATE OR DELETE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger();

CREATE TRIGGER trg_audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger();
