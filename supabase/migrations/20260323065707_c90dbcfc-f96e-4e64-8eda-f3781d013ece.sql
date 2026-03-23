-- Allow admin users to upload to content/ folder in photos bucket
CREATE POLICY "Admin content image upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'photos'
  AND (storage.foldername(name))[1] = 'content'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);