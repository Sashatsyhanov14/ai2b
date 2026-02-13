-- Create unit_photos table for storing property images
CREATE TABLE IF NOT EXISTS unit_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  is_main BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_unit_photos_unit_id ON unit_photos(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_photos_sort_order ON unit_photos(unit_id, sort_order);
