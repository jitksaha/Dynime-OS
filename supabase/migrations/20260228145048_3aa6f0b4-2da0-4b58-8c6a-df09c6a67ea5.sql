-- Add UPDATE policy for documents bucket (needed for overwrites)
CREATE POLICY "Authenticated users can update documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

-- Add SELECT policy for authenticated users on documents bucket
-- (the existing one allows anyone, but let's ensure it covers auth checks during upload)
DROP POLICY IF EXISTS "Anyone can read documents" ON storage.objects;
CREATE POLICY "Anyone can read documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');