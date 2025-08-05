-- Update store_settings RLS policy to allow kasir role to manage store settings
DROP POLICY IF EXISTS "Admin can manage store settings" ON public.store_settings;

CREATE POLICY "Admin and kasir can manage store settings" 
ON public.store_settings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('admin', 'kasir')
  )
);