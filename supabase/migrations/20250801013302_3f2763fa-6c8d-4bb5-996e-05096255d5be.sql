-- Create chats table for messaging between users
CREATE TABLE public.chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  chat_type TEXT NOT NULL DEFAULT 'group', -- 'group', 'direct'
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_participants table for managing who's in each chat
CREATE TABLE public.chat_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin', 'member'
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(chat_id, user_id)
);

-- Create messages table for chat messages
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'image', 'file'
  reply_to UUID REFERENCES public.messages(id),
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policies for chats
CREATE POLICY "Users can view chats they participate in" 
ON public.chats 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE chat_id = chats.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can create chats" 
ON public.chats 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Chat creators can update their chats" 
ON public.chats 
FOR UPDATE 
USING (auth.uid() = created_by);

-- Create policies for chat_participants
CREATE POLICY "Users can view participants of chats they're in" 
ON public.chat_participants 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp 
    WHERE cp.chat_id = chat_participants.chat_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Chat admins can manage participants" 
ON public.chat_participants 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp 
    WHERE cp.chat_id = chat_participants.chat_id 
    AND cp.user_id = auth.uid() 
    AND cp.role = 'admin'
  )
);

CREATE POLICY "Users can join chats" 
ON public.chat_participants 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policies for messages
CREATE POLICY "Users can view messages in chats they participate in" 
ON public.messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE chat_id = messages.chat_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Chat participants can send messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id 
  AND EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE chat_id = messages.chat_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Message senders can update their messages" 
ON public.messages 
FOR UPDATE 
USING (auth.uid() = sender_id);

-- Create indexes for better performance
CREATE INDEX idx_chat_participants_chat_id ON public.chat_participants(chat_id);
CREATE INDEX idx_chat_participants_user_id ON public.chat_participants(user_id);
CREATE INDEX idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

-- Create triggers for updated_at
CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON public.chats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for all chat tables
ALTER TABLE public.chats REPLICA IDENTITY FULL;
ALTER TABLE public.chat_participants REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Create function to get or create direct chat between two users
CREATE OR REPLACE FUNCTION public.get_or_create_direct_chat(user1_id UUID, user2_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  chat_uuid UUID;
  smaller_id UUID;
  larger_id UUID;
BEGIN
  -- Ensure consistent ordering for direct chats
  IF user1_id < user2_id THEN
    smaller_id := user1_id;
    larger_id := user2_id;
  ELSE
    smaller_id := user2_id;
    larger_id := user1_id;
  END IF;

  -- Check if direct chat already exists
  SELECT c.id INTO chat_uuid
  FROM public.chats c
  WHERE c.chat_type = 'direct'
  AND EXISTS (
    SELECT 1 FROM public.chat_participants cp1 
    WHERE cp1.chat_id = c.id AND cp1.user_id = smaller_id
  )
  AND EXISTS (
    SELECT 1 FROM public.chat_participants cp2 
    WHERE cp2.chat_id = c.id AND cp2.user_id = larger_id
  )
  AND (
    SELECT COUNT(*) FROM public.chat_participants cp 
    WHERE cp.chat_id = c.id
  ) = 2;

  -- If not found, create new direct chat
  IF chat_uuid IS NULL THEN
    INSERT INTO public.chats (name, chat_type, created_by)
    VALUES ('Direct Chat', 'direct', smaller_id)
    RETURNING id INTO chat_uuid;

    -- Add both participants
    INSERT INTO public.chat_participants (chat_id, user_id, role)
    VALUES 
      (chat_uuid, smaller_id, 'member'),
      (chat_uuid, larger_id, 'member');
  END IF;

  RETURN chat_uuid;
END;
$$;