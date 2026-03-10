-- Fix: Photos storage bucket INSERT policy - scope to user's own folder
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;

-- User-scoped uploads (user uploads to their own folder)
CREATE POLICY "Users upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'photos' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Forum image uploads (not user-scoped, uses 'forum' prefix)
CREATE POLICY "Authenticated forum image upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'photos' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = 'forum'
  );