
CREATE TABLE public.page_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  user_id uuid,
  page_path text NOT NULL,
  page_title text,
  referrer text,
  referrer_domain text,
  user_agent text,
  language text,
  screen_width integer,
  screen_height integer,
  country text,
  city text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for common queries
CREATE INDEX idx_page_views_created_at ON public.page_views (created_at DESC);
CREATE INDEX idx_page_views_page_path ON public.page_views (page_path);
CREATE INDEX idx_page_views_referrer_domain ON public.page_views (referrer_domain);

-- Enable RLS
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (anonymous tracking)
CREATE POLICY "Anyone can insert page views" ON public.page_views
  FOR INSERT WITH CHECK (true);

-- Only admins can read
CREATE POLICY "Admins can read page views" ON public.page_views
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete (cleanup)
CREATE POLICY "Admins can delete page views" ON public.page_views
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
