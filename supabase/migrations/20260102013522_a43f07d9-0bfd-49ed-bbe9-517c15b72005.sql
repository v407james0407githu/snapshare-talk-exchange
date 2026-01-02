-- 刪除現有的視圖
DROP VIEW IF EXISTS public.public_profiles;

-- 創建使用 SECURITY INVOKER 的視圖（這是預設行為，但明確指定以確保安全）
CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  username,
  display_name,
  avatar_url,
  bio,
  is_verified,
  is_vip,
  created_at,
  updated_at
FROM public.profiles;

-- 重新授權
GRANT SELECT ON public.public_profiles TO anon, authenticated;