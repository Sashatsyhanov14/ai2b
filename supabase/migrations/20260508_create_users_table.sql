-- =====================================================
-- USERS TABLE - Telegram Users for Mini App
-- Mirrors esimbot pattern with roles and referral system
-- =====================================================

CREATE TABLE IF NOT EXISTS public.users (
  telegram_id BIGINT PRIMARY KEY,
  username TEXT,
  full_name TEXT,
  referrer_id BIGINT REFERENCES public.users(telegram_id),
  balance DECIMAL(10, 2) DEFAULT 0.00,
  lang_code TEXT DEFAULT 'ru',
  role TEXT DEFAULT 'client' CHECK (role IN ('client', 'founder', 'admin', 'manager')),
  custom_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_referrer ON public.users(referrer_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select" ON public.users FOR SELECT USING (true);
CREATE POLICY "users_insert" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_update" ON public.users FOR UPDATE USING (true);
CREATE POLICY "users_delete" ON public.users FOR DELETE USING (true);

-- =====================================================
-- FAQ TABLE - For client-facing and admin FAQ
-- =====================================================

CREATE TABLE IF NOT EXISTS public.faq (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  i18n JSONB DEFAULT '{}',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.faq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "faq_select" ON public.faq FOR SELECT USING (true);
CREATE POLICY "faq_insert" ON public.faq FOR INSERT WITH CHECK (true);
CREATE POLICY "faq_update" ON public.faq FOR UPDATE USING (true);
CREATE POLICY "faq_delete" ON public.faq FOR DELETE USING (true);
