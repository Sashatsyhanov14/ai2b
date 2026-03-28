-- 1. Create category enum type if not exists
DO $$ BEGIN
    CREATE TYPE property_category AS ENUM ('sale', 'rent', 'commercial', 'land');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add new columns to 'units' to accommodate rental data
ALTER TABLE public.units 
ADD COLUMN IF NOT EXISTS category property_category DEFAULT 'sale',
ADD COLUMN IF NOT EXISTS district text,
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
-- 6. FAQ Table
CREATE TABLE IF NOT EXISTS public.faq (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    question text NOT NULL,
    answer text NOT NULL,
    category text DEFAULT 'general',
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    i18n jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.faq ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'faq' AND policyname = 'Allow public read access'
    ) THEN
        CREATE POLICY "Allow public read access" ON public.faq FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'faq' AND policyname = 'Allow all access for service role'
    ) THEN
        CREATE POLICY "Allow all access for service role" ON public.faq FOR ALL USING (true);
    END IF;
END $$;

-- 7. Data Migration to FAQ (from instructions and manual text notes)
DO $$ BEGIN
    -- Move instructions
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bot_instructions') THEN
        INSERT INTO public.faq (question, answer, category)
        SELECT 'Инструкция', text, 'instruction'
        FROM public.bot_instructions;
    END IF;

    -- Move text knowledge bits
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'company_files') THEN
        INSERT INTO public.faq (question, answer, category)
        SELECT name, content_text, 'knowledge'
        FROM public.company_files
        WHERE file_type = 'text' AND content_text IS NOT NULL;
    END IF;
END $$;

-- 8. PHOTO MIGRATION (Move from legacy unit_photos to units array)
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'unit_photos') THEN
        -- Transfer photos into the units.photos array
        UPDATE public.units u
        SET photos = COALESCE(
            (
                SELECT array_agg(url ORDER BY sort_order)
                FROM public.unit_photos up
                WHERE up.unit_id = u.id
            ),
            '{}'::text[]
        )
        WHERE EXISTS (
            SELECT 1 FROM public.unit_photos up WHERE up.unit_id = u.id
        ) AND array_length(u.photos, 1) IS NULL; -- only if empty

        -- Drop the legacy table
        DROP TABLE public.unit_photos CASCADE;
    END IF;
END $$;

-- 9. PROPERTY CATEGORY RENAMING
-- The old 'sale' and 'rent' categories were confusing as they mixed property type with transaction type.
-- We add 'residential' to represent Apartments/Villas cleanly.
ALTER TYPE property_category ADD VALUE IF NOT EXISTS 'residential';

-- Update all existing apartments/villas currently stored under the legacy names
UPDATE public.units 
SET category = 'residential' 
WHERE category IN ('sale', 'rent');

-- 10. EXPLICIT TRANSACTIONS ARRAY
-- Store 'sale' and/or 'rent' directly to support cheap AI models and explicit toggles
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS transactions text[] DEFAULT '{}'::text[];

UPDATE public.units
SET transactions = ARRAY(
  SELECT unnest(array_remove(ARRAY[
    CASE WHEN price IS NOT NULL THEN 'sale' ELSE NULL END,
    CASE WHEN price_per_month IS NOT NULL OR price_per_day IS NOT NULL THEN 'rent' ELSE NULL END
  ], NULL))
);
