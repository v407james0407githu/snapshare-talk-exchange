
-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Users cannot directly update profiles" ON public.profiles;

-- Create a policy that only allows admins to directly update profiles
CREATE POLICY "Only admins can directly update profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
