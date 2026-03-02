import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: units } = await supabase.from('units').select('id, title');
    console.log("Units in DB:", units?.length);
    if (units) {
        for (const u of units.slice(0, 3)) {
            const { data: photos } = await supabase.from('unit_photos').select('url').eq('unit_id', u.id);
            console.log(`Unit ${u.id} (${u.title}): ${photos?.length} photos`);
        }
    }
}

run();
