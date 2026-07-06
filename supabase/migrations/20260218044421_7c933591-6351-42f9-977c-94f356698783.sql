
-- Drop partial unique indexes that don't work with ON CONFLICT
DROP INDEX IF EXISTS idx_pdm_products_external;
DROP INDEX IF EXISTS idx_pdm_orders_external;

-- Create non-partial unique indexes
CREATE UNIQUE INDEX idx_pdm_products_external ON public.pdm_products (tenant_id, external_id, external_platform);
CREATE UNIQUE INDEX idx_pdm_orders_external ON public.pdm_orders (tenant_id, external_id, external_platform);
