-- Migration: Add land-specific fields to units table
ALTER TABLE units ADD COLUMN IF NOT EXISTS ada text;
ALTER TABLE units ADD COLUMN IF NOT EXISTS parsel text;
ALTER TABLE units ADD COLUMN IF NOT EXISTS density numeric;
ALTER TABLE units ADD COLUMN IF NOT EXISTS height_limit numeric;
