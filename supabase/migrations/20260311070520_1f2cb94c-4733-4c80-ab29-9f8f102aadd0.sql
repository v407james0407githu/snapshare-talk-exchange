-- 1. Fix notifications INSERT policy: prevent spoofing
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Only allow trigger-based inserts (SECURITY DEFINER functions bypass RLS)
CREATE POLICY "No direct client inserts"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- 2. Fix photo_ratings SELECT: restrict to own ratings only
DROP POLICY IF EXISTS "Ratings are viewable by everyone" ON public.photo_ratings;

CREATE POLICY "Users can view own ratings"
  ON public.photo_ratings FOR SELECT
  USING (auth.uid() = user_id);

-- 3. Add content length validation triggers
CREATE OR REPLACE FUNCTION public.validate_comment_length()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF char_length(NEW.content) > 5000 THEN
    RAISE EXCEPTION 'Comment content exceeds maximum length of 5000 characters';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_forum_reply_length()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF char_length(NEW.content) > 10000 THEN
    RAISE EXCEPTION 'Forum reply content exceeds maximum length of 10000 characters';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_message_length()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF char_length(NEW.content) > 2000 THEN
    RAISE EXCEPTION 'Message content exceeds maximum length of 2000 characters';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_comment_length ON public.comments;
CREATE TRIGGER check_comment_length
  BEFORE INSERT OR UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.validate_comment_length();

DROP TRIGGER IF EXISTS check_forum_reply_length ON public.forum_replies;
CREATE TRIGGER check_forum_reply_length
  BEFORE INSERT OR UPDATE ON public.forum_replies
  FOR EACH ROW EXECUTE FUNCTION public.validate_forum_reply_length();

DROP TRIGGER IF EXISTS check_message_length ON public.messages;
CREATE TRIGGER check_message_length
  BEFORE INSERT OR UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.validate_message_length();