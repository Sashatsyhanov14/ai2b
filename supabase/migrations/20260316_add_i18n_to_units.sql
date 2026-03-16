-- Migration to add i18n column for multi-language dashboard support and strict AI English focus
-- Description: Adds a JSONB column to store RU and TR translations for unit fields.

ALTER TABLE units ADD COLUMN IF NOT EXISTS i18n jsonb DEFAULT '{}'::jsonb;
