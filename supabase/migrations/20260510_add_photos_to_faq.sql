-- Add photos column to faq table
ALTER TABLE faq ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';
