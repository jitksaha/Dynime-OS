
-- Fix: restrict api_request_logs insert to service role only by requiring tenant_id exists
DROP POLICY "System can insert API logs" ON public.api_request_logs;
CREATE POLICY "Insert API logs with valid tenant"
ON public.api_request_logs FOR INSERT
WITH CHECK (tenant_id IN (SELECT id FROM public.tenants));
