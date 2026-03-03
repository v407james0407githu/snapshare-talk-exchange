
-- Allow admins/moderators to update any comment (for hiding)
CREATE POLICY "Admins can update all comments"
ON public.comments
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Allow admins/moderators to delete any comment
CREATE POLICY "Admins can delete all comments"
ON public.comments
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Allow admins/moderators to view hidden comments too
CREATE POLICY "Admins can view all comments"
ON public.comments
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
