
-- Homepage sections ordering table
CREATE TABLE public.homepage_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text NOT NULL UNIQUE,
  section_label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;

-- Anyone can read
CREATE POLICY "Anyone can view homepage sections" ON public.homepage_sections
  FOR SELECT USING (true);

-- Only admins can manage
CREATE POLICY "Admins can manage homepage sections" ON public.homepage_sections
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- System settings table
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value text NOT NULL DEFAULT '',
  setting_type text NOT NULL DEFAULT 'text',
  setting_label text NOT NULL,
  setting_group text NOT NULL DEFAULT 'general',
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view system settings" ON public.system_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage system settings" ON public.system_settings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Insert default homepage sections
INSERT INTO public.homepage_sections (section_key, section_label, sort_order) VALUES
  ('hero', '首頁橫幅', 1),
  ('equipment_categories', '攝影討論區', 2),
  ('featured_carousel', '精選輪播', 3),
  ('featured_gallery', '精選相簿', 4),
  ('forum_preview', '熱門討論', 5),
  ('marketplace_preview', '二手市集', 6),
  ('cta', 'CTA 行動呼籲', 7);

-- Insert default system settings
INSERT INTO public.system_settings (setting_key, setting_label, setting_group, setting_type, setting_value, sort_order) VALUES
  ('site_name', '網站名稱', 'general', 'text', '光影社群', 1),
  ('site_description', '網站描述', 'general', 'text', '攝影愛好者的交流平台', 2),
  ('site_logo_url', 'Logo 網址', 'general', 'text', '', 3),
  ('seo_title', 'SEO 標題', 'seo', 'text', '光影社群 - 攝影愛好者的交流平台', 1),
  ('seo_description', 'SEO 描述', 'seo', 'text', '分享攝影作品、交流攝影技巧、買賣二手器材', 2),
  ('registration_enabled', '開放註冊', 'features', 'boolean', 'true', 1),
  ('daily_upload_limit', '每日上傳限制', 'features', 'number', '10', 2),
  ('comment_moderation', '留言審核', 'features', 'boolean', 'false', 3),
  ('marketplace_enabled', '二手市集', 'features', 'boolean', 'true', 4),
  ('forum_enabled', '討論區', 'features', 'boolean', 'true', 5),
  ('email_welcome_subject', '歡迎郵件主旨', 'email', 'text', '歡迎加入光影社群！', 1),
  ('email_welcome_body', '歡迎郵件內容', 'email', 'textarea', '感謝您加入光影社群，開始分享您的攝影故事吧！', 2);
