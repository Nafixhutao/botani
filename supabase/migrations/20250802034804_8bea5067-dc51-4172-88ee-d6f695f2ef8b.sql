-- Fix infinite recursion in chat_participants policies
-- Drop problematic policies first
DROP POLICY IF EXISTS "Users can view participants of chats they're in" ON public.chat_participants;
DROP POLICY IF EXISTS "Chat admins can manage participants" ON public.chat_participants;

-- Create simpler, non-recursive policies
CREATE POLICY "Users can view chat participants" 
ON public.chat_participants 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage their own participation" 
ON public.chat_participants 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Also fix messages policy to avoid recursion
DROP POLICY IF EXISTS "Users can view messages in chats they participate in" ON public.messages;
DROP POLICY IF EXISTS "Chat participants can send messages" ON public.messages;

-- Create simpler message policies
CREATE POLICY "Users can view messages" 
ON public.messages 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can send messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own messages" 
ON public.messages 
FOR UPDATE 
USING (auth.uid() = sender_id);

ALTER TABLE messages ADD COLUMN file_url TEXT;