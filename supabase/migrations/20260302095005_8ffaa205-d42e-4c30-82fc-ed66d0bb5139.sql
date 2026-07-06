
-- Drop any existing audit triggers first, then recreate
DROP TRIGGER IF EXISTS audit_employees ON public.employees;
DROP TRIGGER IF EXISTS audit_deals ON public.deals;
DROP TRIGGER IF EXISTS audit_invoices ON public.invoices;
DROP TRIGGER IF EXISTS audit_expenses ON public.expenses;
DROP TRIGGER IF EXISTS audit_payments ON public.payments;
DROP TRIGGER IF EXISTS audit_tickets ON public.tickets;
DROP TRIGGER IF EXISTS audit_projects ON public.projects;
DROP TRIGGER IF EXISTS audit_attendance ON public.attendance_records;
DROP TRIGGER IF EXISTS audit_leave_requests ON public.leave_requests;
DROP TRIGGER IF EXISTS audit_campaigns ON public.campaigns;
DROP TRIGGER IF EXISTS audit_documents ON public.documents;
DROP TRIGGER IF EXISTS audit_payroll ON public.payroll_records;
DROP TRIGGER IF EXISTS audit_workflows ON public.approval_workflows;

-- Create audit triggers
CREATE TRIGGER audit_employees AFTER INSERT OR UPDATE OR DELETE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.auto_audit_log();

CREATE TRIGGER audit_deals AFTER INSERT OR UPDATE OR DELETE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.auto_audit_log();

CREATE TRIGGER audit_invoices AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.auto_audit_log();

CREATE TRIGGER audit_expenses AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.auto_audit_log();

CREATE TRIGGER audit_payments AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.auto_audit_log();

CREATE TRIGGER audit_tickets AFTER INSERT OR UPDATE OR DELETE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.auto_audit_log();

CREATE TRIGGER audit_projects AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.auto_audit_log();

CREATE TRIGGER audit_attendance AFTER INSERT OR UPDATE OR DELETE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.auto_audit_log();

CREATE TRIGGER audit_leave_requests AFTER INSERT OR UPDATE OR DELETE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.auto_audit_log();

CREATE TRIGGER audit_campaigns AFTER INSERT OR UPDATE OR DELETE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.auto_audit_log();

CREATE TRIGGER audit_documents AFTER INSERT OR UPDATE OR DELETE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.auto_audit_log();

CREATE TRIGGER audit_payroll AFTER INSERT OR UPDATE OR DELETE ON public.payroll_records
  FOR EACH ROW EXECUTE FUNCTION public.auto_audit_log();

CREATE TRIGGER audit_workflows AFTER INSERT OR UPDATE OR DELETE ON public.approval_workflows
  FOR EACH ROW EXECUTE FUNCTION public.auto_audit_log();
