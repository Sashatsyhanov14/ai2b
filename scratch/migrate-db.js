const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const client = new Client({
  host: 'aws-0-eu-central-1.pooler.supabase.com',
  port: 6543,
  user: 'postgres.dqlhdiuufqtsblkhhlnk',
  password: 'm3dmA23bg9uOcgDm',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    await client.connect();
    console.log('Connected to Supabase DB!');
    
    const sql = `
      ALTER TABLE units ADD COLUMN IF NOT EXISTS ada TEXT;
      ALTER TABLE units ADD COLUMN IF NOT EXISTS parsel TEXT;
      ALTER TABLE units ADD COLUMN IF NOT EXISTS density NUMERIC;
      ALTER TABLE units ADD COLUMN IF NOT EXISTS height_limit NUMERIC;
      ALTER TABLE units ADD COLUMN IF NOT EXISTS district TEXT;
      ALTER TABLE units ADD COLUMN IF NOT EXISTS area NUMERIC;
      ALTER TABLE units ADD COLUMN IF NOT EXISTS living_rooms INTEGER;
      ALTER TABLE units ADD COLUMN IF NOT EXISTS floor INTEGER;
      ALTER TABLE units ADD COLUMN IF NOT EXISTS total_floors INTEGER;
      ALTER TABLE units ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
      ALTER TABLE units ADD COLUMN IF NOT EXISTS price_sale NUMERIC;
      ALTER TABLE units ADD COLUMN IF NOT EXISTS price_month NUMERIC;
      ALTER TABLE units ADD COLUMN IF NOT EXISTS price_day NUMERIC;

      -- Create media bucket if not exists
      INSERT INTO storage.buckets (id, name, public)
      VALUES ('media', 'media', true)
      ON CONFLICT (id) DO NOTHING;

      -- Storage policies (public)
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access' AND tablename = 'objects' AND schemaname = 'storage') THEN
          CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'media');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Upload' AND tablename = 'objects' AND schemaname = 'storage') THEN
          CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media');
        END IF;
      END $$;
    `;
    
    await client.query(sql);
    console.log('Migration successful!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await client.end();
  }
}

migrate();
