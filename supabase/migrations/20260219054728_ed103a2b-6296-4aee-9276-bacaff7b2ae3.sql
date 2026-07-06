
-- Auto-approve KYC when all required fields are filled
CREATE OR REPLACE FUNCTION public.auto_verify_kyc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Auto-approve if all critical fields are present
  IF NEW.status = 'pending'
    AND NEW.full_name IS NOT NULL AND NEW.full_name != ''
    AND NEW.document_number IS NOT NULL AND NEW.document_number != ''
    AND NEW.document_type IS NOT NULL
    AND NEW.document_front_url IS NOT NULL
    AND NEW.date_of_birth IS NOT NULL
  THEN
    NEW.status := 'approved';
    NEW.reviewed_at := now();
    NEW.rejection_reason := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_verify_kyc
  BEFORE INSERT ON public.kyc_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_verify_kyc();
