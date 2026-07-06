
-- 1. Make documents bucket private
UPDATE storage.buckets SET public = false WHERE id = 'documents';

-- 2. Drop old permissive SELECT policy for documents
DROP POLICY IF EXISTS "Anyone can read documents" ON storage.objects;

-- 3. Create tenant-scoped SELECT policy for documents
CREATE POLICY "Tenant members can read own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
);

-- 4. Drop the auto_verify_kyc trigger that auto-approves KYC
DROP TRIGGER IF EXISTS auto_verify_kyc ON public.kyc_verifications;
DROP FUNCTION IF EXISTS public.auto_verify_kyc();
