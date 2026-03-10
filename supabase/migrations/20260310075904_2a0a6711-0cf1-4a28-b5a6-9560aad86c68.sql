
INSERT INTO public.system_settings (setting_key, setting_label, setting_value, setting_type, setting_group, sort_order) VALUES
-- 社群區塊
('footer_community_title', '社群區塊標題', '社群', 'text', 'footer', 1),
('footer_community_label_1', '社群連結 1 - 名稱', '討論區', 'text', 'footer', 2),
('footer_community_url_1', '社群連結 1 - 網址', '/forums', 'text', 'footer', 3),
('footer_community_label_2', '社群連結 2 - 名稱', '作品分享', 'text', 'footer', 4),
('footer_community_url_2', '社群連結 2 - 網址', '/gallery', 'text', 'footer', 5),
('footer_community_label_3', '社群連結 3 - 名稱', '二手交易', 'text', 'footer', 6),
('footer_community_url_3', '社群連結 3 - 網址', '/marketplace', 'text', 'footer', 7),
('footer_community_label_4', '社群連結 4 - 名稱', '哈拉打屁', 'text', 'footer', 8),
('footer_community_url_4', '社群連結 4 - 網址', '/lounge', 'text', 'footer', 9),
-- 攝影區塊
('footer_photo_title', '攝影區塊標題', '攝影', 'text', 'footer', 10),
('footer_photo_label_1', '攝影連結 1 - 名稱', '手機攝影', 'text', 'footer', 11),
('footer_photo_url_1', '攝影連結 1 - 網址', '/equipment/mobile', 'text', 'footer', 12),
('footer_photo_label_2', '攝影連結 2 - 名稱', '相機討論', 'text', 'footer', 13),
('footer_photo_url_2', '攝影連結 2 - 網址', '/equipment/camera', 'text', 'footer', 14),
('footer_photo_label_3', '攝影連結 3 - 名稱', '鏡頭評測', 'text', 'footer', 15),
('footer_photo_url_3', '攝影連結 3 - 網址', '/equipment/lens', 'text', 'footer', 16),
('footer_photo_label_4', '攝影連結 4 - 名稱', '配件週邊', 'text', 'footer', 17),
('footer_photo_url_4', '攝影連結 4 - 網址', '/equipment/accessories', 'text', 'footer', 18)
ON CONFLICT DO NOTHING;
