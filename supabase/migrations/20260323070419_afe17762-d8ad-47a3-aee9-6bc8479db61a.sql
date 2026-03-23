-- Allow authenticated users to upload message images to messages/ folder
CREATE POLICY "Users can upload message images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'photos'
  AND (storage.foldername(name))[1] = 'messages'
  AND auth.uid() IS NOT NULL
);