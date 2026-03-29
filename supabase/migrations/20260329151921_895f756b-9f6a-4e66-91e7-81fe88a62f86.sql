-- 建立品牌型號管理表
CREATE TABLE public.brand_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  brand text NOT NULL,
  model_name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX brand_models_unique ON public.brand_models (category, brand, model_name);

ALTER TABLE public.brand_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view brand models" ON public.brand_models FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage brand models" ON public.brand_models FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

-- Apple
INSERT INTO public.brand_models (category, brand, model_name, sort_order) VALUES
('phone', 'apple', 'iPhone 16 Pro Max', 1),
('phone', 'apple', 'iPhone 16 Pro', 2),
('phone', 'apple', 'iPhone 16 Plus', 3),
('phone', 'apple', 'iPhone 16', 4),
('phone', 'apple', 'iPhone 16e', 5),
('phone', 'apple', 'iPhone 15 Pro Max', 6),
('phone', 'apple', 'iPhone 15 Pro', 7),
('phone', 'apple', 'iPhone 15 Plus', 8),
('phone', 'apple', 'iPhone 15', 9);

-- Samsung
INSERT INTO public.brand_models (category, brand, model_name, sort_order) VALUES
('phone', 'samsung', 'Galaxy S25 Ultra', 1),
('phone', 'samsung', 'Galaxy S25+', 2),
('phone', 'samsung', 'Galaxy S25', 3),
('phone', 'samsung', 'Galaxy Z Fold 6', 4),
('phone', 'samsung', 'Galaxy Z Flip 6', 5),
('phone', 'samsung', 'Galaxy S24 Ultra', 6),
('phone', 'samsung', 'Galaxy S24+', 7),
('phone', 'samsung', 'Galaxy S24', 8),
('phone', 'samsung', 'Galaxy S24 FE', 9),
('phone', 'samsung', 'Galaxy Z Fold 5', 10),
('phone', 'samsung', 'Galaxy Z Flip 5', 11);

-- Google Pixel
INSERT INTO public.brand_models (category, brand, model_name, sort_order) VALUES
('phone', 'pixel', 'Pixel 9 Pro XL', 1),
('phone', 'pixel', 'Pixel 9 Pro', 2),
('phone', 'pixel', 'Pixel 9 Pro Fold', 3),
('phone', 'pixel', 'Pixel 9', 4),
('phone', 'pixel', 'Pixel 8 Pro', 5),
('phone', 'pixel', 'Pixel 8', 6),
('phone', 'pixel', 'Pixel 8a', 7);

-- Vivo
INSERT INTO public.brand_models (category, brand, model_name, sort_order) VALUES
('phone', 'vivo', 'X200 Pro', 1),
('phone', 'vivo', 'X200', 2),
('phone', 'vivo', 'X100 Ultra', 3),
('phone', 'vivo', 'X100 Pro', 4),
('phone', 'vivo', 'X100', 5),
('phone', 'vivo', 'V40 Pro', 6),
('phone', 'vivo', 'V40', 7);

-- OPPO
INSERT INTO public.brand_models (category, brand, model_name, sort_order) VALUES
('phone', 'oppo', 'Find X8 Pro', 1),
('phone', 'oppo', 'Find X8', 2),
('phone', 'oppo', 'Find X7 Ultra', 3),
('phone', 'oppo', 'Find N5', 4),
('phone', 'oppo', 'Find N3 Flip', 5),
('phone', 'oppo', 'Reno 12 Pro', 6),
('phone', 'oppo', 'Reno 12', 7),
('phone', 'oppo', 'Reno 11 Pro', 8),
('phone', 'oppo', 'Reno 11', 9);

-- Xiaomi
INSERT INTO public.brand_models (category, brand, model_name, sort_order) VALUES
('phone', 'xiaomi', 'Xiaomi 15 Ultra', 1),
('phone', 'xiaomi', 'Xiaomi 15 Pro', 2),
('phone', 'xiaomi', 'Xiaomi 15', 3),
('phone', 'xiaomi', 'Xiaomi 14 Ultra', 4),
('phone', 'xiaomi', 'Xiaomi 14 Pro', 5),
('phone', 'xiaomi', 'Xiaomi 14', 6),
('phone', 'xiaomi', 'Redmi Note 14 Pro+', 7),
('phone', 'xiaomi', 'Redmi Note 14 Pro', 8),
('phone', 'xiaomi', 'Redmi Note 13 Pro+', 9),
('phone', 'xiaomi', 'Redmi Note 13 Pro', 10);

-- Huawei
INSERT INTO public.brand_models (category, brand, model_name, sort_order) VALUES
('phone', '華為Huawei', 'Pura 70 Ultra', 1),
('phone', '華為Huawei', 'Pura 70 Pro+', 2),
('phone', '華為Huawei', 'Pura 70 Pro', 3),
('phone', '華為Huawei', 'Pura 70', 4),
('phone', '華為Huawei', 'Mate 70 Pro+', 5),
('phone', '華為Huawei', 'Mate 70 Pro', 6),
('phone', '華為Huawei', 'Mate 70', 7),
('phone', '華為Huawei', 'Mate 60 Pro+', 8),
('phone', '華為Huawei', 'Mate 60 Pro', 9);

-- Sony camera
INSERT INTO public.brand_models (category, brand, model_name, sort_order) VALUES
('camera', 'sony', 'α1 II (ILCE-1M2)', 1),
('camera', 'sony', 'α9 III (ILCE-9M3)', 2),
('camera', 'sony', 'α7R V (ILCE-7RM5)', 3),
('camera', 'sony', 'α7C II (ILCE-7CM2)', 4),
('camera', 'sony', 'α7CR (ILCE-7CR)', 5),
('camera', 'sony', 'α7 IV (ILCE-7M4)', 6),
('camera', 'sony', 'α6700 (ILCE-6700)', 7),
('camera', 'sony', 'ZV-E10 II', 8),
('camera', 'sony', 'ZV-E1', 9),
('camera', 'sony', 'RX100 VII', 10);

-- Canon
INSERT INTO public.brand_models (category, brand, model_name, sort_order) VALUES
('camera', 'canon', 'EOS R1', 1),
('camera', 'canon', 'EOS R5 Mark II', 2),
('camera', 'canon', 'EOS R5', 3),
('camera', 'canon', 'EOS R6 Mark II', 4),
('camera', 'canon', 'EOS R8', 5),
('camera', 'canon', 'EOS R7', 6),
('camera', 'canon', 'EOS R10', 7),
('camera', 'canon', 'EOS R50', 8),
('camera', 'canon', 'EOS R100', 9),
('camera', 'canon', 'PowerShot V10', 10);

-- Nikon
INSERT INTO public.brand_models (category, brand, model_name, sort_order) VALUES
('camera', 'nikon', 'Z9', 1),
('camera', 'nikon', 'Z8', 2),
('camera', 'nikon', 'Z6 III', 3),
('camera', 'nikon', 'Z5 II', 4),
('camera', 'nikon', 'Zf', 5),
('camera', 'nikon', 'Zfc', 6),
('camera', 'nikon', 'Z50 II', 7),
('camera', 'nikon', 'Z30', 8);

-- Fujifilm
INSERT INTO public.brand_models (category, brand, model_name, sort_order) VALUES
('camera', 'fujifilm', 'X-T50', 1),
('camera', 'fujifilm', 'X-T5', 2),
('camera', 'fujifilm', 'X100VI', 3),
('camera', 'fujifilm', 'X-S20', 4),
('camera', 'fujifilm', 'X-H2S', 5),
('camera', 'fujifilm', 'X-H2', 6),
('camera', 'fujifilm', 'GFX100S II', 7),
('camera', 'fujifilm', 'GFX100 II', 8);

-- Ricoh
INSERT INTO public.brand_models (category, brand, model_name, sort_order) VALUES
('camera', 'ricoh', 'GR III', 1),
('camera', 'ricoh', 'GR IIIx', 2),
('camera', 'ricoh', 'GR III HDF', 3),
('camera', 'ricoh', 'GR IIIx HDF', 4),
('camera', 'ricoh', 'PENTAX K-3 III Monochrome', 5),
('camera', 'ricoh', 'PENTAX 17', 6);

-- Leica
INSERT INTO public.brand_models (category, brand, model_name, sort_order) VALUES
('camera', 'Leica', 'M11-P', 1),
('camera', 'Leica', 'M11', 2),
('camera', 'Leica', 'Q3', 3),
('camera', 'Leica', 'Q3 43', 4),
('camera', 'Leica', 'SL3', 5),
('camera', 'Leica', 'SL3-S', 6),
('camera', 'Leica', 'D-Lux 8', 7),
('camera', 'Leica', 'CL', 8);