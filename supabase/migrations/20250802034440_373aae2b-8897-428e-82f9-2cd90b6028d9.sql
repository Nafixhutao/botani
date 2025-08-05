-- Fix RLS policy for profiles table to allow users to see other profiles for chat functionality
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create new policy that allows authenticated users to view all profiles (needed for chat)
CREATE POLICY "Authenticated users can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Keep the existing update and insert policies
-- Users can still only update their own profile