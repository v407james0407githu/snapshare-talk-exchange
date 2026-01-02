-- Add moderator permission to update photos (for pinning/featuring)
CREATE POLICY "Moderators can update photos for featuring"
ON public.photos
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (has_role(auth.uid(), 'moderator'::app_role));

-- Add moderator permission to update forum topics (for pinning/locking)
CREATE POLICY "Moderators can update forum topics"
ON public.forum_topics
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (has_role(auth.uid(), 'moderator'::app_role));

-- Add admin permission to update forum topics
CREATE POLICY "Admins can manage forum topics"
ON public.forum_topics
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));