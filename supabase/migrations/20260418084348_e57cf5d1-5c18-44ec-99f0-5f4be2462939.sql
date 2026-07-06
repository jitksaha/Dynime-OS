DROP POLICY IF EXISTS "Authenticated can insert AI error logs" ON public.ai_error_logs;

CREATE POLICY "Super admins can insert AI error logs"
ON public.ai_error_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));