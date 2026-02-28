
-- Forum categories with parent-child structure
CREATE TABLE public.forum_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  icon text, -- emoji or icon name
  color text, -- tailwind color class
  parent_id uuid REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active categories" ON public.forum_categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage categories" ON public.forum_categories
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Tags table
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tags" ON public.tags
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create tags" ON public.tags
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can manage tags" ON public.tags
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Content-tags junction table
CREATE TABLE public.content_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  content_id uuid NOT NULL,
  content_type text NOT NULL, -- 'forum_topic' or 'photo'
  created_at timestamptz DEFAULT now(),
  UNIQUE(tag_id, content_id, content_type)
);

ALTER TABLE public.content_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view content tags" ON public.content_tags
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create content tags" ON public.content_tags
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can manage content tags" ON public.content_tags
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add category_id to forum_topics for linking to dynamic categories
ALTER TABLE public.forum_topics ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.forum_categories(id);
