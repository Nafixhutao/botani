-- Create enum types
CREATE TYPE public.user_role AS ENUM ('admin', 'kasir', 'pengantar');
CREATE TYPE public.payment_method AS ENUM ('tunai', 'transfer', 'tempo');
CREATE TYPE public.transaction_type AS ENUM ('toko', 'antar');

-- Create profiles table with roles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'kasir',
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 5,
  unit TEXT NOT NULL DEFAULT 'pcs',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  is_regular BOOLEAN NOT NULL DEFAULT false,
  delivery_schedule TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id),
  user_id UUID NOT NULL,
  transaction_type transaction_type NOT NULL DEFAULT 'toko',
  payment_method payment_method NOT NULL DEFAULT 'tunai',
  subtotal DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  change_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_address TEXT,
  delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transaction_items table
CREATE TABLE public.transaction_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create daily_reports table
CREATE TABLE public.daily_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date DATE NOT NULL UNIQUE,
  opening_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_sales DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_profit DECIMAL(10,2) NOT NULL DEFAULT 0,
  closing_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_transactions INTEGER NOT NULL DEFAULT 0,
  cash_sales DECIMAL(10,2) NOT NULL DEFAULT 0,
  transfer_sales DECIMAL(10,2) NOT NULL DEFAULT 0,
  tempo_sales DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create store_settings table
CREATE TABLE public.store_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_name TEXT NOT NULL DEFAULT 'Toko Saya',
  store_address TEXT,
  store_phone TEXT,
  store_logo TEXT,
  receipt_footer TEXT,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  updated_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for products (all authenticated users can access)
CREATE POLICY "Authenticated users can view products" ON public.products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin and kasir can manage products" ON public.products
  FOR ALL TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'kasir')
  ));

-- Create policies for customers (all authenticated users can access)
CREATE POLICY "Authenticated users can view customers" ON public.customers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage customers" ON public.customers
  FOR ALL TO authenticated USING (true);

-- Create policies for transactions (all authenticated users can access)
CREATE POLICY "Authenticated users can view transactions" ON public.transactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create transactions" ON public.transactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update transactions" ON public.transactions
  FOR UPDATE TO authenticated USING (true);

-- Create policies for transaction_items (all authenticated users can access)
CREATE POLICY "Authenticated users can view transaction items" ON public.transaction_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage transaction items" ON public.transaction_items
  FOR ALL TO authenticated USING (true);

-- Create policies for daily_reports (all authenticated users can access)
CREATE POLICY "Authenticated users can view daily reports" ON public.daily_reports
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin and kasir can manage daily reports" ON public.daily_reports
  FOR ALL TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'kasir')
  ));

-- Create policies for store_settings (all authenticated users can view, admin can manage)
CREATE POLICY "Authenticated users can view store settings" ON public.store_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage store settings" ON public.store_settings
  FOR ALL TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_reports_updated_at BEFORE UPDATE ON public.daily_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_store_settings_updated_at BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate transaction number
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
$$ LANGUAGE plpgsql;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'kasir')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default store settings
INSERT INTO public.store_settings (store_name, store_address, store_phone, updated_by)
VALUES (
  'Toko Galon & Gas',
  'Jl. Contoh No. 123',
  '08123456789',
  '00000000-0000-0000-0000-000000000000'
);

-- Insert sample products
INSERT INTO public.products (name, category, price, cost_price, stock, unit, description) VALUES
('Galon Isi Ulang', 'Air Minum', 4000, 2500, 50, 'galon', 'Air galon isi ulang 19 liter'),
('Gas 3kg', 'Gas LPG', 25000, 20000, 20, 'tabung', 'Gas LPG 3kg untuk rumah tangga'),
('Gas 12kg', 'Gas LPG', 85000, 75000, 10, 'tabung', 'Gas LPG 12kg untuk usaha'),
('Botol Air 600ml', 'Air Kemasan', 3000, 2000, 100, 'botol', 'Air mineral kemasan 600ml'),
('Botol Air 1500ml', 'Air Kemasan', 5000, 3500, 50, 'botol', 'Air mineral kemasan 1500ml'),
('Galon Kosong Baru', 'Galon', 45000, 35000, 15, 'galon', 'Galon kosong baru merk Aqua'),
('Regulator Gas', 'Aksesoris', 35000, 25000, 8, 'pcs', 'Regulator gas untuk tabung 3kg/12kg');