
-- Insert sample forum topics with different categories
-- First get category IDs
DO $$
DECLARE
  phone_cat_id uuid;
  camera_cat_id uuid;
  tech_cat_id uuid;
  chat_cat_id uuid;
  sample_user_id uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
  SELECT id INTO phone_cat_id FROM public.forum_categories WHERE slug = 'phone-photography' LIMIT 1;
  SELECT id INTO camera_cat_id FROM public.forum_categories WHERE slug = 'camera-photography' LIMIT 1;
  SELECT id INTO tech_cat_id FROM public.forum_categories WHERE slug = 'photography-tech' LIMIT 1;
  SELECT id INTO chat_cat_id FROM public.forum_categories WHERE slug = 'casual-talk' LIMIT 1;

  -- Only insert if we don't already have many topics
  IF (SELECT count(*) FROM public.forum_topics) < 5 THEN
    INSERT INTO public.forum_topics (title, content, category, brand, category_id, user_id, reply_count, view_count, is_pinned, created_at) VALUES
    ('【心得】Sony A7C II 一個月使用心得分享', '入手 Sony A7C II 已經一個月了，來分享一下使用心得。整體來說這台機身的對焦性能非常出色，特別是眼部追蹤對焦，拍人像時幾乎不用擔心失焦。體積也控制得很好，搭配 28-60mm kit 鏡出門非常輕便。', '相機攝影', 'Sony', camera_cat_id, sample_user_id, 42, 1567, true, now() - interval '2 hours'),
    ('iPhone 16 Pro 夜拍實測，ProRAW 真的有差嗎？', '最近入手了 iPhone 16 Pro，特別測試了一下夜拍能力。用 ProRAW 拍攝後再後製，跟直出 HEIF 比較，差異其實蠻明顯的。ProRAW 在暗部細節保留更多，後製空間大很多。', '手機攝影', 'Apple', phone_cat_id, sample_user_id, 28, 892, false, now() - interval '5 hours'),
    ('Fujifilm X100VI 終於入手！開箱分享', '等了好久終於搶到 X100VI！簡單開箱分享一下。外觀延續 X100 系列的經典設計，新增的 IBIS 真的是大加分。底片模擬 Reala Ace 色彩超級好看，直出就很有味道。', '相機攝影', 'Fujifilm', camera_cat_id, sample_user_id, 65, 2341, false, now() - interval '8 hours'),
    ('請教各位前輩：街拍構圖有什麼建議？', '最近開始學習街拍，但總覺得構圖不太好看。想請教各位前輩，街拍時有什麼構圖技巧或注意事項嗎？特別是在人多的地方，要怎麼抓到好的畫面？', '攝影技術', NULL, tech_cat_id, sample_user_id, 15, 456, false, now() - interval '12 hours'),
    ('Ricoh GR IIIx vs Fujifilm X100V 該怎麼選？', '目前在考慮買一台口袋機，主要用途是日常記錄和旅遊。GR IIIx 體積小很多，但 X100V 的畫質和操控感覺更好。請問有同時用過這兩台的前輩可以給點建議嗎？', '相機攝影', NULL, camera_cat_id, sample_user_id, 33, 1123, false, now() - interval '1 day'),
    ('Galaxy S24 Ultra 200MP 模式實拍分享', '用 Samsung Galaxy S24 Ultra 的 200MP 模式拍了一些照片，放大裁切後細節還是很驚人的。分享幾組實拍給大家參考。', '手機攝影', 'Samsung', phone_cat_id, sample_user_id, 19, 678, false, now() - interval '1 day 3 hours'),
    ('長曝光攝影入門教學 - 器材與設定', '分享一下長曝光攝影的入門知識，包括需要的器材（腳架、ND 減光鏡）、相機設定技巧，以及一些常見的拍攝題材如車軌、星軌、瀑布等。', '攝影技術', NULL, tech_cat_id, sample_user_id, 51, 1890, true, now() - interval '2 days'),
    ('小米 14 Ultra 攝影套裝組開箱體驗', '入手小米 14 Ultra 攝影套裝組，附帶的攝影手把質感不錯，搭配 Leica 調色拍出來的照片很有感覺。來分享一下開箱和實拍體驗。', '手機攝影', 'Xiaomi', phone_cat_id, sample_user_id, 12, 445, false, now() - interval '2 days 5 hours'),
    ('Nikon Z8 vs Sony A7R V 高畫素機身比較', '最近在考慮升級高畫素機身，主要拍攝風景和商業攝影。Nikon Z8 和 Sony A7R V 都是不錯的選擇，想聽聽各位的使用經驗和建議。', '相機攝影', NULL, camera_cat_id, sample_user_id, 27, 934, false, now() - interval '3 days'),
    ('週末攝影人聊天室 - 大家最近拍了什麼？', '週末到了！大家最近有拍到什麼好照片嗎？分享一下最近的攝影心得或趣事吧～', '哈拉打屁', NULL, chat_cat_id, sample_user_id, 88, 2567, false, now() - interval '3 days 2 hours'),
    ('Vivo X100 Pro 拍月亮真的很厲害', 'Vivo X100 Pro 的長焦鏡頭拍月亮效果真的很驚艷，100x 變焦雖然是數位變焦但效果比想像中好很多。分享幾張月亮照片。', '手機攝影', 'Vivo', phone_cat_id, sample_user_id, 8, 334, false, now() - interval '4 days'),
    ('後製軟體推薦 - Lightroom vs Capture One', '想請教大家平常都用什麼後製軟體？Lightroom 跟 Capture One 各有什麼優缺點？還是有其他推薦的軟體？', '攝影技術', NULL, tech_cat_id, sample_user_id, 36, 1234, false, now() - interval '4 days 6 hours'),
    ('Canon R6 Mark II 鳥類攝影心得', '用 Canon R6 Mark II 搭配 100-500mm 拍鳥已經半年了，分享一些拍鳥的心得和設定技巧。這台的動物偵測對焦真的很好用。', '相機攝影', 'Canon', camera_cat_id, sample_user_id, 22, 789, false, now() - interval '5 days'),
    ('Google Pixel 9 Pro 計算攝影有多強？', 'Google Pixel 9 Pro 的計算攝影能力真的很強，特別是 Night Sight 和 Magic Eraser 功能。來跟大家分享一些實拍對比。', '手機攝影', 'Google', phone_cat_id, sample_user_id, 14, 521, false, now() - interval '5 days 8 hours'),
    ('新手入門相機推薦 2024', '最近想入坑攝影，預算大概 3-5 萬台幣，主要拍風景和日常生活。請問有什麼推薦的入門相機嗎？', '哈拉打屁', NULL, chat_cat_id, sample_user_id, 45, 1678, false, now() - interval '6 days');

    -- Insert some tags
    INSERT INTO public.tags (name, slug, usage_count) VALUES
    ('街拍', 'street-photography', 15),
    ('風景', 'landscape', 23),
    ('夜拍', 'night-photography', 18),
    ('人像', 'portrait', 12),
    ('開箱', 'unboxing', 9),
    ('心得', 'review', 21),
    ('教學', 'tutorial', 7),
    ('器材', 'gear', 14),
    ('後製', 'post-processing', 8),
    ('月亮', 'moon', 5)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
