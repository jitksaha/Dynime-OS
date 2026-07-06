-- Allow anyone (including anon) to read enabled social sign-in providers on login/signup
CREATE POLICY "Anyone can view enabled social providers"
ON public.social_signin_providers
FOR SELECT
TO anon, authenticated
USING (is_enabled = true);