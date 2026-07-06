ALTER TABLE public.tenant_modules
ADD COLUMN IF NOT EXISTS module_name TEXT;

CREATE INDEX IF NOT EXISTS idx_tenant_modules_tenant_module
  ON public.tenant_modules(tenant_id, module_name);