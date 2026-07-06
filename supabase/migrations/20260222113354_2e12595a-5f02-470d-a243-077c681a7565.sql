
-- Create storage bucket for mobile app assets
INSERT INTO storage.buckets (id, name, public) VALUES ('mobile-app-assets', 'mobile-app-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload mobile app assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'mobile-app-assets');

-- Allow public read access
CREATE POLICY "Public can view mobile app assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'mobile-app-assets');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update mobile app assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'mobile-app-assets');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete mobile app assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'mobile-app-assets');
