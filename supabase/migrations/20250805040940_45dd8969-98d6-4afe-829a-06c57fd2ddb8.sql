-- Update storage policies for chat files to ensure visibility for all users
DROP POLICY IF EXISTS "Users can view chat files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload chat files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own chat files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own chat files" ON storage.objects;

-- Create new policies for chat files with proper visibility
CREATE POLICY "Anyone can view chat files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'chat-files');

CREATE POLICY "Authenticated users can upload chat files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'chat-files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update chat files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'chat-files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete chat files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'chat-files' AND auth.role() = 'authenticated');