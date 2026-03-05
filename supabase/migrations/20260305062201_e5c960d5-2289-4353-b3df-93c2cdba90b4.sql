
INSERT INTO public.system_settings (setting_key, setting_label, setting_value, setting_type, setting_group, sort_order)
VALUES ('site_logo_url', '網站 Logo 圖片', '', 'image', 'general', 0)
ON CONFLICT DO NOTHING;
