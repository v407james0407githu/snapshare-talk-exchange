
-- Fix overly permissive INSERT policies
DROP POLICY IF EXISTS "Authenticated users can create tags" ON public.tags;
CREATE POLICY "Authenticated users can create tags" ON public.tags
  FOR INSERT TO authenticated WITH CHECK (
    NOT EXISTS (SELECT 1 FROM public.tags t WHERE t.name = tags.name)
  );

DROP POLICY IF EXISTS "Authenticated users can create content tags" ON public.content_tags;
CREATE POLICY "Authenticated users can create content tags" ON public.content_tags
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Also allow authenticated users to delete their own content tags
CREATE POLICY "Users can delete own content tags" ON public.content_tags
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.forum_topics ft WHERE ft.id = content_tags.content_id AND ft.user_id = auth.uid()
      ) OR EXISTS (
        SELECT 1 FROM public.photos p WHERE p.id = content_tags.content_id AND p.user_id = auth.uid()
      )
    )
  );
