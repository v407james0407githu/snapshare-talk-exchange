-- 通知系統表
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'comment', 'rating', 'message', 'system'
  title TEXT NOT NULL,
  content TEXT,
  related_type TEXT, -- 'photo', 'listing', 'message'
  related_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 收藏表
CREATE TABLE public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content_type TEXT NOT NULL, -- 'photo', 'listing'
  content_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, content_type, content_id)
);

-- 私訊對話表
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant1_id UUID NOT NULL,
  participant2_id UUID NOT NULL,
  listing_id UUID, -- 可選，關聯到商品
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(participant1_id, participant2_id, listing_id)
);

-- 私訊訊息表
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 啟用 RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 通知 RLS 政策
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- 收藏 RLS 政策
CREATE POLICY "Users can view own favorites"
  ON public.favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own favorites"
  ON public.favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON public.favorites FOR DELETE
  USING (auth.uid() = user_id);

-- 對話 RLS 政策
CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);

CREATE POLICY "Users can update own conversations"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

-- 訊息 RLS 政策
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
    )
  );

CREATE POLICY "Users can update own messages"
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
    )
  );

-- 建立通知觸發器函數
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  photo_owner_id UUID;
  photo_title TEXT;
  commenter_name TEXT;
BEGIN
  -- 獲取照片擁有者和標題
  SELECT user_id, title INTO photo_owner_id, photo_title
  FROM public.photos WHERE id = NEW.photo_id;
  
  -- 獲取評論者名稱
  SELECT COALESCE(display_name, username) INTO commenter_name
  FROM public.profiles WHERE user_id = NEW.user_id;
  
  -- 只有在不是自己評論自己的照片時才發送通知
  IF photo_owner_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, content, related_type, related_id)
    VALUES (
      photo_owner_id,
      'comment',
      '新留言通知',
      commenter_name || ' 在您的作品「' || photo_title || '」留下了評論',
      'photo',
      NEW.photo_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 建立評分通知觸發器函數
CREATE OR REPLACE FUNCTION public.notify_on_rating()
RETURNS TRIGGER AS $$
DECLARE
  photo_owner_id UUID;
  photo_title TEXT;
  rater_name TEXT;
BEGIN
  -- 獲取照片擁有者和標題
  SELECT user_id, title INTO photo_owner_id, photo_title
  FROM public.photos WHERE id = NEW.photo_id;
  
  -- 獲取評分者名稱
  SELECT COALESCE(display_name, username) INTO rater_name
  FROM public.profiles WHERE user_id = NEW.user_id;
  
  -- 只有在不是自己評分自己的照片時才發送通知
  IF photo_owner_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, content, related_type, related_id)
    VALUES (
      photo_owner_id,
      'rating',
      '新評分通知',
      rater_name || ' 給您的作品「' || photo_title || '」評了 ' || NEW.rating || ' 星',
      'photo',
      NEW.photo_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 建立私訊通知觸發器函數
CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS TRIGGER AS $$
DECLARE
  receiver_id UUID;
  sender_name TEXT;
BEGIN
  -- 獲取接收者 ID
  SELECT CASE 
    WHEN c.participant1_id = NEW.sender_id THEN c.participant2_id
    ELSE c.participant1_id
  END INTO receiver_id
  FROM public.conversations c WHERE c.id = NEW.conversation_id;
  
  -- 獲取發送者名稱
  SELECT COALESCE(display_name, username) INTO sender_name
  FROM public.profiles WHERE user_id = NEW.sender_id;
  
  INSERT INTO public.notifications (user_id, type, title, content, related_type, related_id)
  VALUES (
    receiver_id,
    'message',
    '新訊息通知',
    sender_name || ' 傳送了一則訊息給您',
    'message',
    NEW.conversation_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 建立觸發器
CREATE TRIGGER on_comment_notify
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_comment();

CREATE TRIGGER on_rating_notify
  AFTER INSERT ON public.photo_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_rating();

CREATE TRIGGER on_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_message();

-- 啟用即時更新
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;