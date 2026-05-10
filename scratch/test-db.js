const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSchema() {
  console.log('Testing Units table...');
  const { error: unitErr } = await supabase.from('units').insert({ 
    address: 'Test', 
    ada: '123', 
    parsel: '456', 
    district: 'Test Dist' 
  }).select();
  
  if (unitErr) {
    console.log('Units Insert Error:', unitErr.message);
  } else {
    console.log('Units Insert OK (columns ada/parsel exist)');
  }

  console.log('Testing FAQ table...');
  const { error: faqErr } = await supabase.from('faq').insert({
    question: 'Test Q',
    answer: 'Test A',
    i18n: { questions: { ru: 'Test' }, answers: { ru: 'Test' } }
  }).select();

  if (faqErr) {
    console.log('FAQ Insert Error:', faqErr.message);
  } else {
    console.log('FAQ Insert OK');
  }
}

testSchema();
