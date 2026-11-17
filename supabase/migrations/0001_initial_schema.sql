-- PayTrack POS Initial Schema (Tables, Indexes, RLS, Auto-Profile Trigger, Realtime)
-- Migration: 0001_initial_schema.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Helper trigger to maintain updated_at timestamps
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- 2. Tables
CREATE TABLE IF NOT EXISTS public.shop_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_name text NOT NULL DEFAULT 'Tạp Hóa Mẹ',
  phone text,
  address text,
  bank_bin text,
  bank_name text,
  bank_account_no text,
  bank_account_name text,
  reminder_digest_enabled boolean NOT NULL DEFAULT true,
  reminder_default_hour text NOT NULL DEFAULT '08:30',
  last_digest_sent_date date,
  default_invoice_format text NOT NULL DEFAULT 'a5' CHECK (default_invoice_format IN ('a5', '80mm')),
  default_show_cumulative_debt boolean NOT NULL DEFAULT true,
  default_show_qr_on_invoice boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  search_text text NOT NULL,
  unit text NOT NULL DEFAULT 'cái',
  price bigint NOT NULL CHECK (price >= 0),
  cost_price bigint CHECK (cost_price IS NULL OR cost_price >= 0),
  category text,
  sku text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  search_text text NOT NULL,
  phone text,
  note text,
  total_debt bigint NOT NULL DEFAULT 0 CHECK (total_debt >= 0),
  next_due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_code text NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name_snapshot text NOT NULL DEFAULT 'Khách lẻ',
  subtotal bigint NOT NULL CHECK (subtotal >= 0),
  discount_amount bigint NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount bigint NOT NULL CHECK (total_amount >= 0),
  paid_amount bigint NOT NULL DEFAULT 0 CHECK (paid_amount >= 0 AND paid_amount <= total_amount),
  remaining_amount bigint GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  previous_customer_debt bigint NOT NULL DEFAULT 0 CHECK (previous_customer_debt >= 0),
  payment_status text NOT NULL CHECK (payment_status IN ('paid', 'partial', 'unpaid', 'cancelled')),
  payment_method text NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'transfer', 'debt', 'mixed')),
  debt_due_date date,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT orders_user_order_code_unique UNIQUE (user_id, order_code),
  CONSTRAINT orders_debt_requires_customer CHECK (total_amount = paid_amount OR customer_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  unit text NOT NULL DEFAULT 'cái',
  unit_price bigint NOT NULL CHECK (unit_price >= 0),
  cost_price bigint CHECK (cost_price IS NULL OR cost_price >= 0),
  quantity numeric(10, 2) NOT NULL CHECK (quantity > 0),
  line_total bigint NOT NULL CHECK (line_total >= 0)
);

CREATE TABLE IF NOT EXISTS public.debt_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  amount bigint NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'transfer')),
  note text,
  paid_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.debt_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  reminder_type text NOT NULL DEFAULT 'custom' CHECK (reminder_type IN ('digest', 'custom')),
  scheduled_for timestamptz NOT NULL,
  message text,
  target_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'dismissed')),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  device_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_products_user_active_name ON public.products(user_id, is_active, name);
CREATE INDEX IF NOT EXISTS idx_products_user_search ON public.products(user_id, search_text);
CREATE INDEX IF NOT EXISTS idx_customers_user_debt ON public.customers(user_id, total_debt DESC);
CREATE INDEX IF NOT EXISTS idx_customers_user_search ON public.customers(user_id, search_text);
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON public.orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_customer_status ON public.orders(user_id, customer_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_customer_paid ON public.debt_payments(user_id, customer_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_debt_reminders_pending ON public.debt_reminders(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);

-- 4. Updated-at triggers
DROP TRIGGER IF EXISTS trg_shop_profiles_updated_at ON public.shop_profiles;
CREATE TRIGGER trg_shop_profiles_updated_at BEFORE UPDATE ON public.shop_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_customers_updated_at ON public.customers;
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Auto-provision default shop_profiles on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.shop_profiles (user_id, shop_name)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data ->> 'shop_name'), ''), 'Tạp Hóa Mẹ')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Row Level Security (strictly scoped to user_id = auth.uid())
ALTER TABLE public.shop_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shop_profiles_owner" ON public.shop_profiles;
CREATE POLICY "shop_profiles_owner" ON public.shop_profiles
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "products_owner" ON public.products;
CREATE POLICY "products_owner" ON public.products
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "customers_owner" ON public.customers;
CREATE POLICY "customers_owner" ON public.customers
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "orders_owner" ON public.orders;
CREATE POLICY "orders_owner" ON public.orders
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "order_items_owner" ON public.order_items;
CREATE POLICY "order_items_owner" ON public.order_items
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "debt_payments_owner" ON public.debt_payments;
CREATE POLICY "debt_payments_owner" ON public.debt_payments
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "debt_reminders_owner" ON public.debt_reminders;
CREATE POLICY "debt_reminders_owner" ON public.debt_reminders
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "push_subscriptions_owner" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_owner" ON public.push_subscriptions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 7. Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'customers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'debt_payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.debt_payments;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'debt_reminders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.debt_reminders;
  END IF;
END
$$;
