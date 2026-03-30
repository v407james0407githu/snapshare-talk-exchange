
-- Create marketplace_categories table (same structure as forum_categories)
CREATE TABLE public.marketplace_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  parent_id UUID REFERENCES public.marketplace_categories(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage marketplace categories"
  ON public.marketplace_categories FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view active marketplace categories"
  ON public.marketplace_categories FOR SELECT
  USING (is_active = true);

-- Seed main categories
INSERT INTO public.marketplace_categories (name, slug, icon, color, sort_order) VALUES
  ('手機', 'phone', 'Smartphone', 'green', 1),
  ('相機', 'camera', 'Camera', 'blue', 2);

-- Seed brand sub-categories for 手機
INSERT INTO public.marketplace_categories (name, slug, parent_id, sort_order)
SELECT brand, LOWER(brand), phone.id, row_number() OVER ()
FROM (VALUES ('Apple'), ('Samsung'), ('Google'), ('Sony'), ('Xiaomi'), ('OPPO'), ('vivo')) AS b(brand),
     (SELECT id FROM public.marketplace_categories WHERE slug = 'phone') AS phone;

-- Seed brand sub-categories for 相機
INSERT INTO public.marketplace_categories (name, slug, parent_id, sort_order)
SELECT brand, LOWER(brand), camera.id, row_number() OVER ()
FROM (VALUES ('Sony'), ('Canon'), ('Nikon'), ('Fujifilm'), ('Panasonic'), ('Leica'), ('Olympus')) AS b(brand),
     (SELECT id FROM public.marketplace_categories WHERE slug = 'camera') AS camera;
