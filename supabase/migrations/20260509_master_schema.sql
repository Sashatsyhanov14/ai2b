-- Master Clean Schema for Estate Bot (V2 - with Unit Types and Intents)
-- Consolidates all properties into a single 'units' table

-- 1. Cleanup
DROP TABLE IF EXISTS public.rental_units CASCADE;
DROP TABLE IF EXISTS public.sale_properties CASCADE;
DROP TABLE IF EXISTS public.rental_bookings CASCADE;
DROP TABLE IF EXISTS public.unit_photos CASCADE;
DROP TABLE IF EXISTS public.units CASCADE;

-- 2. Consolidated Units Table
CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title JSONB DEFAULT '{"ru": "Новый объект"}'::jsonb,
  description JSONB DEFAULT '{"ru": ""}'::jsonb,
  city TEXT NOT NULL DEFAULT 'Alanya',
  address TEXT,
  unit_type TEXT NOT NULL DEFAULT 'apartment' CHECK (unit_type IN ('apartment', 'land', 'villa', 'commercial', 'invest')),
  intent TEXT NOT NULL DEFAULT 'sale' CHECK (intent IN ('sale', 'rent')),
  price NUMERIC DEFAULT 0,
  price_period TEXT DEFAULT 'total' CHECK (price_period IN ('total', 'month', 'day')),
  bedrooms INT DEFAULT 1,
  bathrooms INT DEFAULT 1,
  area_m2 NUMERIC,
  photos TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Unified Leads/Orders Table
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id BIGINT REFERENCES public.users(telegram_id),
  unit_id UUID REFERENCES public.units(id),
  name TEXT,
  phone TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed', 'cancelled')),
  source TEXT DEFAULT 'mini_app'
);

-- 4. Disable RLS for Mini App ease of use
ALTER TABLE public.units DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;

-- 5. Permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
