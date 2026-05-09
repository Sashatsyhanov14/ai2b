-- Migration: Add detailed property features to units table
ALTER TABLE units ADD COLUMN IF NOT EXISTS bedrooms integer;
ALTER TABLE units ADD COLUMN IF NOT EXISTS bathrooms integer;
ALTER TABLE units ADD COLUMN IF NOT EXISTS living_rooms integer;
ALTER TABLE units ADD COLUMN IF NOT EXISTS area numeric;
ALTER TABLE units ADD COLUMN IF NOT EXISTS floor integer;
ALTER TABLE units ADD COLUMN IF NOT EXISTS total_floors integer;
ALTER TABLE units ADD COLUMN IF NOT EXISTS tags text[]; -- Array of strings for features like 'Pool', 'Gym', etc.
