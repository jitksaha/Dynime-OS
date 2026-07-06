
-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create active_sessions table for session management
CREATE TABLE public.active_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_token TEXT NOT NULL,
  device_info TEXT,
  ip_address TEXT,
  last_active TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
ON public.active_sessions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own sessions"
ON public.active_sessions FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own sessions"
ON public.active_sessions FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own sessions"
ON public.active_sessions FOR DELETE
USING (user_id = auth.uid());

-- Index for performance
CREATE INDEX idx_active_sessions_user ON public.active_sessions(user_id, is_active);
