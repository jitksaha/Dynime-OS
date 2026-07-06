
-- Add unique constraint for external sync upserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_pdm_products_external
ON public.pdm_products (tenant_id, external_id, external_platform)
WHERE external_id IS NOT NULL AND external_platform IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pdm_orders_external
ON public.pdm_orders (tenant_id, external_id, external_platform)
WHERE external_id IS NOT NULL AND external_platform IS NOT NULL;
