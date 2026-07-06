CREATE TABLE IF NOT EXISTS public.ai_error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  model TEXT,
  http_status INTEGER,
  error_code TEXT,
  error_message TEXT,
  raw_response JSONB,
  feature TEXT,
  user_id UUID,
  tenant_id UUID,
  request_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_error_logs_created_at ON public.ai_error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_error_logs_provider ON public.ai_error_logs (provider);

ALTER TABLE public.ai_error_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can view all logs
CREATE POLICY "Super admins can view AI error logs"
ON public.ai_error_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Super admins can delete logs (for cleanup)
CREATE POLICY "Super admins can delete AI error logs"
ON public.ai_error_logs
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Allow inserts from authenticated context (edge functions use service role which bypasses RLS anyway)
CREATE POLICY "Authenticated can insert AI error logs"
ON public.ai_error_logs
FOR INSERT
TO authenticated
WITH CHECK (true);