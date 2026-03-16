const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUnits() {
    const { data, error } = await supabase
        .from('units')
        .select('*')
        .or('city.ilike.%Стамбул%,city.ilike.%Istanbul%,address.ilike.%Стамбул%,address.ilike.%Istanbul%');

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Found Istanbul units:", data.length);
        console.log(JSON.stringify(data, null, 2));
    }
}

checkUnits();
