-- Migration: Add Deals Logic and Referral Commission (2.5%)
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS referrer_id BIGINT REFERENCES public.users(telegram_id),
ADD COLUMN IF NOT EXISTS deal_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 0.025,
ADD COLUMN IF NOT EXISTS commission_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS bonus_paid_at TIMESTAMPTZ;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_leads_referrer_id ON public.leads(referrer_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);

COMMENT ON COLUMN public.leads.commission_rate IS 'Default referral commission rate (0.025 = 2.5%)';
