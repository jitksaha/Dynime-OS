ALTER TABLE public.whatsapp_templates
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_branch_id ON public.whatsapp_templates(branch_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_branch_id ON public.whatsapp_logs(branch_id);
CREATE INDEX IF NOT EXISTS idx_workflows_branch_id ON public.workflows(branch_id);