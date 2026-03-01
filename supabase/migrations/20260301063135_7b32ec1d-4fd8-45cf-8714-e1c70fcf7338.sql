
-- Make title nullable (no longer required)
ALTER TABLE public.hero_banners ALTER COLUMN title DROP NOT NULL;

-- Add text alignment setting
ALTER TABLE public.hero_banners ADD COLUMN text_align text NOT NULL DEFAULT 'left';

-- Add gradient overlay settings
ALTER TABLE public.hero_banners ADD COLUMN gradient_type text NOT NULL DEFAULT 'left-to-right';
ALTER TABLE public.hero_banners ADD COLUMN gradient_opacity numeric NOT NULL DEFAULT 0.6;
