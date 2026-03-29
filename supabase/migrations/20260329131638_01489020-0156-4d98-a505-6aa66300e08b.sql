
-- Remove icons from all subcategories (brands)
UPDATE forum_categories SET icon = NULL WHERE parent_id IS NOT NULL;

-- Update mobile brand sort_order to match upload form: apple(1), samsung(2), xiaomi(3), vivo(4), oppo(5), google(6), huawei(7)
UPDATE forum_categories SET sort_order = 1 WHERE slug = 'mobile-apple';
UPDATE forum_categories SET sort_order = 2 WHERE slug = 'mobile-samsung';
UPDATE forum_categories SET sort_order = 3 WHERE slug = 'mobile-xiaomi';
UPDATE forum_categories SET sort_order = 4 WHERE slug = 'mobile-vivo';
UPDATE forum_categories SET sort_order = 5 WHERE slug = 'mobile-oppo';
UPDATE forum_categories SET sort_order = 6 WHERE slug = 'mobile-pixel';
UPDATE forum_categories SET sort_order = 7 WHERE slug = 'mobile-華為Huawei';

-- Update camera brand sort_order to match upload form: sony(1), canon(2), nikon(3), fujifilm(4), ricoh(5)
UPDATE forum_categories SET sort_order = 1 WHERE slug = 'camera-sony';
UPDATE forum_categories SET sort_order = 2 WHERE slug = 'camera-canon';
UPDATE forum_categories SET sort_order = 3 WHERE slug = 'camera-nikon';
UPDATE forum_categories SET sort_order = 4 WHERE slug = 'camera-fujifilm';
UPDATE forum_categories SET sort_order = 5 WHERE slug = 'camera-ricoh';
