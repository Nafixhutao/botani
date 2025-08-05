-- Add online status and typing indicators to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;

-- Create typing_indicators table for real-time typing status
CREATE TABLE IF NOT EXISTS public.typing_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL,
  user_id UUID NOT NULL,
  is_typing BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chat_id, user_id)
);

-- Enable RLS on typing_indicators
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- Create policies for typing_indicators
CREATE POLICY "Users can view typing indicators in their chats" 
ON public.typing_indicators 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM chat_participants 
  WHERE chat_participants.chat_id = typing_indicators.chat_id 
  AND chat_participants.user_id = auth.uid()
));

CREATE POLICY "Users can manage their own typing indicators" 
ON public.typing_indicators 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add typing_indicators to realtime
ALTER TABLE public.typing_indicators REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;

-- Create trigger for updated_at
CREATE TRIGGER update_typing_indicators_updated_at
BEFORE UPDATE ON public.typing_indicators
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update user online status
CREATE OR REPLACE FUNCTION public.update_user_online_status(user_uuid UUID, status BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles 
  SET 
    is_online = status,
    last_seen = CASE WHEN status = false THEN now() ELSE last_seen END,
    updated_at = now()
  WHERE user_id = user_uuid;
END;
$$;