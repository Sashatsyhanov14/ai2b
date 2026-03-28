-- 1. Create category enum type if not exists
DO $$ BEGIN
    CREATE TYPE property_category AS ENUM ('sale', 'rent', 'commercial', 'land');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add new columns to 'units' to accommodate rental data
ALTER TABLE public.units 
ADD COLUMN IF NOT EXISTS category property_category DEFAULT 'sale',
ADD COLUMN IF NOT EXISTS price_per_day numeric,
ADD COLUMN IF NOT EXISTS price_per_month numeric,
ADD COLUMN IF NOT EXISTS bedrooms integer,
ADD COLUMN IF NOT EXISTS bathrooms integer,
ADD COLUMN IF NOT EXISTS max_guests integer,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS photos text[] DEFAULT '{}';

-- 3. Migration: Move data from 'rental_units' to 'units' (Safe check)
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'rental_units') THEN
        INSERT INTO public.units (
            category, title, city, address, description, 
            price_per_day, price_per_month, bedrooms, bathrooms, max_guests, 
            features, i18n, photos, is_active, created_at
        )
        SELECT 
            'rent'::property_category, title, city, address, description,
            price_per_day, price_per_month, bedrooms, bathrooms, max_guests,
            features, i18n, photos, is_active, created_at
        FROM public.rental_units;
    END IF;
END $$;

-- 4. Update existing 'units' to have their correct category
-- Default is 'sale', but if type was 'commercial' or 'land', we update it.
UPDATE public.units SET category = 'commercial' WHERE type = 'commercial';
UPDATE public.units SET category = 'land' WHERE type = 'land';
UPDATE public.units SET category = 'sale' WHERE type NOT IN ('commercial', 'land') AND category = 'sale';

-- 5. Cleanup: (RUN THIS ONLY AFTER VERIFYING DATA IN 'units')
-- Remove dependent tables first (as per user request to remove booking logic)
DROP TABLE IF EXISTS public.rental_bookings CASCADE;
DROP TABLE IF EXISTS public.unit_calendar CASCADE;
DROP TABLE IF EXISTS public.rental_units CASCADE;

-- Remove other redundant/empty tables (as per user request: instructions, settings, scores, queue)
DROP TABLE IF EXISTS public.bot_instructions CASCADE;
DROP TABLE IF EXISTS public.bot_settings CASCADE;
DROP TABLE IF EXISTS public.session_scores CASCADE;
DROP TABLE IF EXISTS public.reactivation_queue CASCADE;
