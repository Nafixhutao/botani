-- Create chat-files bucket for file uploads
-- This is a simple bucket creation without RLS modifications
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-files', 'chat-files', true)
ON CONFLICT (id) DO NOTHING; 