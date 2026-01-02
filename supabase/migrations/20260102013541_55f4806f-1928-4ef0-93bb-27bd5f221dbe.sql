-- 刪除現有視圖，改用不同的方法
DROP VIEW IF EXISTS public.public_profiles;

-- 保持原有的限制性政策，但添加一個函數來安全地獲取公開資料
CREATE OR REPLACE FUNCTION public.get_public_profile(target_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  is_verified boolean,
  is_vip boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
  FROM public.profiles
  WHERE profiles.user_id = target_user_id
$$;

-- 創建一個函數來獲取多個公開用戶資料
CREATE OR REPLACE FUNCTION public.get_public_profiles()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  is_verified boolean,
  is_vip boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
  FROM public.profiles
$$;