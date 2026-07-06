-- Calendar events table to track synced events
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'general',
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  all_day boolean DEFAULT false,
  location text,
  attendees text[],
  source_module text,
  source_id text,
  google_event_id text,
  sync_status text DEFAULT 'pending',
  color text,
  reminder_minutes integer DEFAULT 30,
  is_recurring boolean DEFAULT false,
  recurrence_rule text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant calendar events"
  ON public.calendar_events FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can create calendar events for own tenant"
  ON public.calendar_events FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update own tenant calendar events"
  ON public.calendar_events FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can delete own tenant calendar events"
  ON public.calendar_events FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE INDEX idx_calendar_events_tenant ON public.calendar_events(tenant_id);
CREATE INDEX idx_calendar_events_start ON public.calendar_events(start_time);
CREATE INDEX idx_calendar_events_source ON public.calendar_events(source_module, source_id);

CREATE TRIGGER audit_calendar_events
  AFTER INSERT OR UPDATE OR DELETE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.auto_audit_log();