
CREATE OR REPLACE FUNCTION public.enforce_daily_upload_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_tw DATE;
  current_count INTEGER;
  max_uploads INTEGER;
  is_user_vip BOOLEAN;
BEGIN
  -- 以台灣時區 (UTC+8) 計算今天日期
  today_tw := (now() AT TIME ZONE 'Asia/Taipei')::date;

  -- 取得使用者的 VIP 狀態與上傳紀錄
  SELECT 
    COALESCE(p.is_vip, false),
    COALESCE(p.daily_upload_count, 0),
    p.last_upload_date
  INTO is_user_vip, current_count, today_tw
  FROM public.profiles p
  WHERE p.user_id = NEW.user_id;

  -- 檢查 last_upload_date，若不是今天則重置計數
  SELECT 
    COALESCE(p.daily_upload_count, 0),
    p.last_upload_date
  INTO current_count, today_tw
  FROM public.profiles p
  WHERE p.user_id = NEW.user_id;

  -- 重新正確取值
  DECLARE
    user_last_date DATE;
    user_count INTEGER;
    user_vip BOOLEAN;
  BEGIN
    SELECT 
      COALESCE(p.is_vip, false),
      COALESCE(p.daily_upload_count, 0),
      p.last_upload_date
    INTO user_vip, user_count, user_last_date
    FROM public.profiles p
    WHERE p.user_id = NEW.user_id;

    today_tw := (now() AT TIME ZONE 'Asia/Taipei')::date;
    max_uploads := CASE WHEN user_vip THEN 10 ELSE 3 END;

    -- 若上次上傳日期不是今天，重置計數
    IF user_last_date IS NULL OR user_last_date < today_tw THEN
      user_count := 0;
    END IF;

    -- 檢查是否超過限制
    IF user_count >= max_uploads THEN
      RAISE EXCEPTION '每日上傳上限為 % 張照片（台灣時間），請明天再試', max_uploads;
    END IF;

    -- 更新計數
    UPDATE public.profiles
    SET daily_upload_count = user_count + 1,
        last_upload_date = today_tw
    WHERE user_id = NEW.user_id;
  END;

  RETURN NEW;
END;
$$;

-- 建立觸發器
DROP TRIGGER IF EXISTS check_daily_upload_limit ON public.photos;
CREATE TRIGGER check_daily_upload_limit
  BEFORE INSERT ON public.photos
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_daily_upload_limit();
