
-- Project Tasks table
CREATE TABLE public.project_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  assigned_to UUID,
  assigned_name TEXT,
  due_date DATE,
  estimated_hours NUMERIC(6,2) DEFAULT 0,
  actual_hours NUMERIC(6,2) DEFAULT 0,
  parent_task_id UUID REFERENCES public.project_tasks(id) ON DELETE SET NULL,
  sort_order INT DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project Milestones table
CREATE TABLE public.project_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project CRM Links (link projects/tasks to deals, contacts)
CREATE TABLE public.project_crm_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL DEFAULT 'deal',
  linked_entity_id UUID NOT NULL,
  linked_entity_name TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project Activity Log
CREATE TABLE public.project_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  user_id UUID NOT NULL,
  user_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add priority and category columns to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS budget NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS actual_cost NUMERIC(12,2) DEFAULT 0;

-- Enable RLS
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_crm_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_tasks
CREATE POLICY "Users can view tasks in their tenant" ON public.project_tasks FOR SELECT TO authenticated USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert tasks in their tenant" ON public.project_tasks FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update tasks in their tenant" ON public.project_tasks FOR UPDATE TO authenticated USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete tasks in their tenant" ON public.project_tasks FOR DELETE TO authenticated USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for project_milestones
CREATE POLICY "Users can view milestones in their tenant" ON public.project_milestones FOR SELECT TO authenticated USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert milestones in their tenant" ON public.project_milestones FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update milestones in their tenant" ON public.project_milestones FOR UPDATE TO authenticated USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete milestones in their tenant" ON public.project_milestones FOR DELETE TO authenticated USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for project_crm_links
CREATE POLICY "Users can view CRM links in their tenant" ON public.project_crm_links FOR SELECT TO authenticated USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert CRM links in their tenant" ON public.project_crm_links FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete CRM links in their tenant" ON public.project_crm_links FOR DELETE TO authenticated USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for project_activities
CREATE POLICY "Users can view activities in their tenant" ON public.project_activities FOR SELECT TO authenticated USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert activities in their tenant" ON public.project_activities FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Enable realtime for tasks
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_activities;
