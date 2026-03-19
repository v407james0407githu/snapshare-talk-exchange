
-- Create a SECURITY DEFINER function that only allows updating safe profile fields
CREATE OR REPLACE FUNCTION public.update_own_profile(
  _display_name text DEFAULT NULL,
  _bio text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _avatar_url text DEFAULT NULL,
  _username text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.profiles
  SET
    display_name = COALESCE(_display_name, display_name),
    bio = COALESCE(_bio, bio),
    phone = COALESCE(_phone, phone),
    avatar_url = COALESCE(_avatar_url, avatar_url),
    username = COALESCE(_username, username),
    updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;

-- Drop the old permissive UPDATE policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create a restrictive UPDATE policy that blocks all direct client updates
-- Only admin/service-role or the RPC function (SECURITY DEFINER) can update
CREATE POLICY "Users cannot directly update profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);
