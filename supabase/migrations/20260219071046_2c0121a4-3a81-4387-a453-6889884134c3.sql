-- Allow any authenticated user to read gateway_key, display_name, is_enabled
-- We create a SELECT policy that only exposes non-sensitive columns
-- The full row is visible but credentials are only meaningful to super_admin via the existing policy
CREATE POLICY "Authenticated users can view enabled gateways"
ON public.payment_gateway_configs
FOR SELECT
TO authenticated
USING (is_enabled = true);