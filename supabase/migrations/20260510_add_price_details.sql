-- Migration: Add detailed price fields to units table
ALTER TABLE units ADD COLUMN IF NOT EXISTS price_sale numeric;
ALTER TABLE units ADD COLUMN IF NOT EXISTS price_month numeric;
ALTER TABLE units ADD COLUMN IF NOT EXISTS price_day numeric;
ALTER TABLE units ADD COLUMN IF NOT EXISTS price_period text DEFAULT 'total'; -- 'total', 'month', 'day'
