-- Fix security definer functions with proper search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.generate_transaction_number()
RETURNS TEXT AS $$
DECLARE
  prefix TEXT := 'TRX';
  date_part TEXT := to_char(now(), 'YYYYMMDD');
  counter INTEGER;
  result TEXT;
BEGIN
  -- Get today's transaction count
  SELECT COUNT(*) + 1 INTO counter
  FROM public.transactions
  WHERE DATE(created_at) = CURRENT_DATE;
  
  -- Format: TRX20241201001
  result := prefix || date_part || LPAD(counter::TEXT, 3, '0');
  
  -- Check if exists, increment if needed
  WHILE EXISTS (SELECT 1 FROM public.transactions WHERE transaction_number = result) LOOP
    counter := counter + 1;
    result := prefix || date_part || LPAD(counter::TEXT, 3, '0');
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'kasir')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Create function to check user role safely
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role::TEXT 
    FROM public.profiles 
    WHERE user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';