ALTER TABLE public.payment_gateway_configs ADD COLUMN IF NOT EXISTS processing_currency text DEFAULT NULL;

UPDATE public.payment_gateway_configs SET processing_currency = 'BDT' WHERE gateway_key = 'bkash';
UPDATE public.payment_gateway_configs SET processing_currency = 'BDT' WHERE gateway_key = 'sslcommerz';
UPDATE public.payment_gateway_configs SET processing_currency = NULL WHERE gateway_key = 'stripe';
UPDATE public.payment_gateway_configs SET processing_currency = 'USD' WHERE gateway_key = 'paypal';
UPDATE public.payment_gateway_configs SET processing_currency = 'USD' WHERE gateway_key = 'paypal_card';
UPDATE public.payment_gateway_configs SET processing_currency = 'USD' WHERE gateway_key = 'paddle';
UPDATE public.payment_gateway_configs SET processing_currency = 'USD' WHERE gateway_key = 'dodo';

COMMENT ON COLUMN public.payment_gateway_configs.processing_currency IS 'The currency this gateway processes in. NULL = multi-currency. Set to force conversion.';