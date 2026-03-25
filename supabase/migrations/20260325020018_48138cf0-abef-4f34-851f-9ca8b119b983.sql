-- 1. Drop old permissive DELETE policy on messages (allowed any participant to delete any message)
DROP POLICY IF EXISTS "Users can delete messages in their conversations" ON public.messages;

-- 2. New DELETE policy: only sender can delete their own messages (still removes for both parties)
CREATE POLICY "Users can delete own sent messages"
ON public.messages FOR DELETE
TO authenticated
USING (sender_id = auth.uid());

-- 3. Allow participants to delete entire conversations
CREATE POLICY "Users can delete own conversations"
ON public.conversations FOR DELETE
TO authenticated
USING (participant1_id = auth.uid() OR participant2_id = auth.uid());
