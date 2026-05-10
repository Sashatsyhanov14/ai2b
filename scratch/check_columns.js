const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    console.log('Checking units table columns...');
    const { data: row, error: rowError } = await supabase.from('units').select('*').limit(1);
    if (rowError) {
        console.error('Error selecting row:', rowError);
    } else {
        console.log('Columns in units table:', Object.keys(row[0] || {}));
    }
}

check();
