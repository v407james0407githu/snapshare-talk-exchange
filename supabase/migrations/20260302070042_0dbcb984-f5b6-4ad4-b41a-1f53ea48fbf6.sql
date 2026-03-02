
ALTER TABLE public.forum_topics ADD COLUMN IF NOT EXISTS image_url text DEFAULT NULL;
ALTER TABLE public.forum_replies ADD COLUMN IF NOT EXISTS image_url text DEFAULT NULL;
