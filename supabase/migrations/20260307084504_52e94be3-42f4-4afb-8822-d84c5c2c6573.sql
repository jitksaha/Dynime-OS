
-- Meetings table for scheduling, instant, and recurring meetings
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  provider TEXT NOT NULL DEFAULT 'jitsi', -- jitsi, google_meet, zoom
  meeting_url TEXT,
  room_id TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INT DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, live, ended, cancelled
  meeting_type TEXT NOT NULL DEFAULT 'one_time', -- one_time, recurring, instant
  recurrence_rule TEXT, -- RRULE string for recurring meetings
  attendees TEXT[] DEFAULT '{}',
  max_participants INT DEFAULT 50,
  is_recorded BOOLEAN DEFAULT false,
  password TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view meetings in their tenant"
  ON public.meetings FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create meetings in their tenant"
  ON public.meetings FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update meetings in their tenant"
  ON public.meetings FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own meetings"
  ON public.meetings FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;

-- Index for performance
CREATE INDEX idx_meetings_tenant_id ON public.meetings(tenant_id);
CREATE INDEX idx_meetings_start_time ON public.meetings(start_time);
CREATE INDEX idx_meetings_status ON public.meetings(status);
