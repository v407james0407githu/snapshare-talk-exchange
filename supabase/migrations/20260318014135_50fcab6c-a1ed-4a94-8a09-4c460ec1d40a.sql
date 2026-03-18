
-- Fix avatar URLs: remove cache-bust query params and change extension to .webp
-- since the conversion script renamed files to .webp and deleted originals
UPDATE profiles
SET avatar_url = regexp_replace(
  regexp_replace(avatar_url, '\?.*$', ''),
  '\.(jpg|jpeg|png|gif|bmp|tiff)$', '.webp'
)
WHERE avatar_url IS NOT NULL
  AND avatar_url LIKE '%/storage/v1/object/public/avatars/%'
  AND avatar_url ~ '\.(jpg|jpeg|png|gif|bmp|tiff)';
