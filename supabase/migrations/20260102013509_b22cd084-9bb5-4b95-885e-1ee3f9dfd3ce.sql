-- 創建一個公開的 profiles 視圖，隱藏敏感欄位
CREATE OR REPLACE VIEW public.public_profiles AS
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

-- 刪除現有的公開 SELECT 政策
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- 創建新的 SELECT 政策：用戶只能查看自己的完整資料
CREATE POLICY "Users can view own full profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- 創建 SELECT 政策：管理員可以查看所有用戶的完整資料
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- 授權匿名用戶和認證用戶可以讀取公開視圖
GRANT SELECT ON public.public_profiles TO anon, authenticated;