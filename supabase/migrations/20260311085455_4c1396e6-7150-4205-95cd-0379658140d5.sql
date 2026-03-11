
CREATE OR REPLACE FUNCTION public.enforce_daily_upload_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_tw DATE;
  user_last_date DATE;
  user_count INTEGER;
  user_vip BOOLEAN;
  max_uploads INTEGER;
BEGIN
  today_tw := (now() AT TIME ZONE 'Asia/Taipei')::date;

  SELECT 
    COALESCE(p.is_vip, false),
    COALESCE(p.daily_upload_count, 0),
    p.last_upload_date
  INTO user_vip, user_count, user_last_date
  FROM public.profiles p
  WHERE p.user_id = NEW.user_id;

  max_uploads := CASE WHEN user_vip THEN 10 ELSE 3 END;

  IF user_last_date IS NULL OR user_last_date < today_tw THEN
    user_count := 0;
  END IF;

  IF user_count >= max_uploads THEN
    RAISE EXCEPTION '每日上傳上限為 % 張照片（台灣時間），請明天再試', max_uploads;
  END IF;

  UPDATE public.profiles
  SET daily_upload_count = user_count + 1,
      last_upload_date = today_tw
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;
