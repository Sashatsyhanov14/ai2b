const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupMediaBucket() {
    console.log('Setting up media bucket...');
    
    // Create bucket if not exists
    const { data: bucket, error: bucketError } = await supabase.storage.createBucket('media', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
        fileSizeLimit: 5242880 // 5MB
    });

    if (bucketError && bucketError.message !== 'Bucket already exists') {
        console.error('Error creating bucket:', bucketError);
    } else {
        console.log('Bucket "media" ensured.');
    }

    // Set public access policy (via direct SQL is better, but we try via API if possible)
    // Actually, createBucket with public: true should handle it in newer Supabase versions.
}

setupMediaBucket();
