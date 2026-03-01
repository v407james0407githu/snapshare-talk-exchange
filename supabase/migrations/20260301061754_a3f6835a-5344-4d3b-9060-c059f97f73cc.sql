
-- Site content management table for dynamic page sections
CREATE TABLE public.site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text NOT NULL UNIQUE,
  section_label text NOT NULL,
  content_type text NOT NULL DEFAULT 'text', -- text, html, image, json
  content_value text NOT NULL DEFAULT '',
  content_meta jsonb DEFAULT '{}',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid
);

-- Enable RLS
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- Anyone can read active content
CREATE POLICY "Anyone can view active site content"
  ON public.site_content FOR SELECT
  USING (is_active = true);

-- Admins can manage all content
CREATE POLICY "Admins can manage site content"
  ON public.site_content FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default content entries for all manageable sections
INSERT INTO public.site_content (section_key, section_label, content_type, content_value, content_meta, sort_order) VALUES
  ('hero_fallback_title_1', '首頁橫幅標題 1', 'text', '用光影說故事，與同好共鳴', '{}', 1),
  ('hero_fallback_subtitle_1', '首頁橫幅副標題 1', 'text', '全台最活躍的攝影創作者社群，分享作品、交流心得。', '{}', 2),
  ('hero_fallback_image_1', '首頁橫幅圖片 1', 'image', 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=1920&q=80', '{}', 3),
  ('cta_title', 'CTA 區塊標題', 'text', '準備好分享您的攝影故事了嗎？', '{}', 10),
  ('cta_subtitle', 'CTA 區塊副標題', 'text', '加入我們的社群，與超過 12,000 位攝影愛好者一起交流、學習、成長。', '{}', 11),
  ('cta_badge', 'CTA 徽章文字', 'text', '免費加入', '{}', 12),
  ('cta_primary_text', 'CTA 主按鈕文字', 'text', '立即加入', '{}', 13),
  ('cta_primary_link', 'CTA 主按鈕連結', 'text', '/auth', '{}', 14),
  ('cta_secondary_text', 'CTA 副按鈕文字', 'text', '了解更多', '{}', 15),
  ('cta_secondary_link', 'CTA 副按鈕連結', 'text', '/gallery', '{}', 16),
  ('gallery_title', '作品分享區標題', 'text', '作品分享區', '{}', 20),
  ('gallery_subtitle', '作品分享區副標題', 'text', '瀏覽社群成員分享的精彩攝影作品，為您喜愛的作品點讚評分', '{}', 21),
  ('forum_title', '討論區標題', 'text', '器材討論區', '{}', 30),
  ('forum_subtitle', '討論區副標題', 'text', '依您使用的器材選擇專區，與同樣愛好者交流心得', '{}', 31),
  ('featured_gallery_title', '精選作品標題', 'text', '精選作品', '{}', 40),
  ('featured_gallery_subtitle', '精選作品副標題', 'text', '社群精選的優質攝影作品', '{}', 41),
  ('footer_copyright', '頁尾版權文字', 'text', '© 2026 光影論壇. All rights reserved.', '{}', 50),
  ('site_announcement', '全站公告', 'text', '', '{"show": false}', 60);
