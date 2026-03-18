-- Fix favicon URL: change extension to .webp since conversion script renamed the file
UPDATE system_settings
SET setting_value = regexp_replace(setting_value, '\.(jpg|jpeg|png|gif|bmp|tiff)$', '.webp'),
    updated_at = now()
WHERE setting_key IN ('site_logo_url', 'site_favicon_url')
  AND setting_value ~ '\.(jpg|jpeg|png|gif|bmp|tiff)$';