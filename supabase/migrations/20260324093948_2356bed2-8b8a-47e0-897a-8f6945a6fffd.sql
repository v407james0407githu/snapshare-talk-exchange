-- Allow conversation participants to delete messages (deletes for both parties)
CREATE POLICY "Users can delete messages in their conversations"
ON public.messages FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
  )
);
