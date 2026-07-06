
-- Remote Worker Tracking Module Tables

-- 1. Tracking configuration per tenant
CREATE TABLE public.tracking_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL UNIQUE,
  is_enabled boolean DEFAULT true,
  screenshot_enabled boolean DEFAULT true,
  screenshot_interval_min integer DEFAULT 3,
  screenshot_interval_max integer DEFAULT 12,
  blur_sensitive boolean DEFAULT false,
  idle_timeout_minutes integer DEFAULT 5,
  url_tracking boolean DEFAULT true,
  app_tracking boolean DEFAULT true,
  keyboard_mouse_tracking boolean DEFAULT true,
  retention_days integer DEFAULT 90,
  work_start_time time DEFAULT '09:00',
  work_end_time time DEFAULT '18:00',
  allow_manual_time boolean DEFAULT true,
  require_task_selection boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Tracking projects
CREATE TABLE public.tracking_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  color text DEFAULT '#4F46E5',
  is_active boolean DEFAULT true,
  budget_hours numeric,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Tracking tasks
CREATE TABLE public.tracking_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES public.tracking_projects(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  assigned_to uuid,
  status text DEFAULT 'open',
  estimated_hours numeric,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Time tracking sessions
CREATE TABLE public.tracking_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  project_id uuid REFERENCES public.tracking_projects(id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.tracking_tasks(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer DEFAULT 0,
  idle_seconds integer DEFAULT 0,
  active_seconds integer DEFAULT 0,
  status text DEFAULT 'active',
  notes text,
  is_manual boolean DEFAULT false,
  manual_approved boolean,
  approved_by uuid,
  keyboard_events integer DEFAULT 0,
  mouse_events integer DEFAULT 0,
  activity_percent numeric DEFAULT 0,
  productivity_score text DEFAULT 'neutral',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Screenshots
CREATE TABLE public.tracking_screenshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  session_id uuid REFERENCES public.tracking_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  screenshot_url text,
  thumbnail_url text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  active_window text,
  active_url text,
  is_blurred boolean DEFAULT false,
  activity_percent numeric DEFAULT 0,
  metadata jsonb
);

-- 6. Activity logs (periodic snapshots)
CREATE TABLE public.tracking_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  session_id uuid REFERENCES public.tracking_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  logged_at timestamptz NOT NULL DEFAULT now(),
  app_name text,
  window_title text,
  url text,
  category text DEFAULT 'neutral',
  keyboard_count integer DEFAULT 0,
  mouse_count integer DEFAULT 0,
  idle_seconds integer DEFAULT 0,
  duration_seconds integer DEFAULT 60
);

-- 7. Manual time correction requests
CREATE TABLE public.tracking_time_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  session_id uuid REFERENCES public.tracking_sessions(id) ON DELETE SET NULL,
  requested_start timestamptz NOT NULL,
  requested_end timestamptz NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.tracking_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_time_corrections ENABLE ROW LEVEL SECURITY;

-- RLS Policies - tenant scoped
CREATE POLICY "Tenant isolation" ON public.tracking_config FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant isolation" ON public.tracking_projects FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant isolation" ON public.tracking_tasks FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant isolation" ON public.tracking_sessions FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant isolation" ON public.tracking_screenshots FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant isolation" ON public.tracking_activity_logs FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant isolation" ON public.tracking_time_corrections FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Enable realtime for sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.tracking_sessions;
