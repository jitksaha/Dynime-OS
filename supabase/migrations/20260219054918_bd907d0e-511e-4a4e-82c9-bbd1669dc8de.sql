
-- Remove the simple auto-approve trigger, replacing with AI-powered verification
DROP TRIGGER IF EXISTS trg_auto_verify_kyc ON public.kyc_verifications;
DROP FUNCTION IF EXISTS public.auto_verify_kyc();
