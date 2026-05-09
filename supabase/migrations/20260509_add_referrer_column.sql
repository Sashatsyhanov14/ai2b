-- 1. Create or Update Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT gen_random_uuid(),
  telegram_id BIGINT PRIMARY KEY,
  username TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'client',
  lang_code TEXT DEFAULT 'ru',
  referrer_id BIGINT,
  balance NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ensure Constraints and Indexes
-- Primary key 'telegram_id' handles uniqueness for upsert

-- 3. Disable RLS and Grant Permissions
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.users TO anon;
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;

-- 4. Referral Index
CREATE INDEX IF NOT EXISTS idx_users_referrer_id ON public.users(referrer_id);


