-- Migration to add features and ai_instructions to rental_units table
-- Documentation: Phase 21 Full Rentals Implementation (Tags and Info extension)

ALTER TABLE public.rental_units ADD COLUMN IF NOT EXISTS features TEXT[] DEFAULT '{}';
ALTER TABLE public.rental_units ADD COLUMN IF NOT EXISTS ai_instructions TEXT;
