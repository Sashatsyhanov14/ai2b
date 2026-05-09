const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function translate(text) {
    if (!text) return null;
    const prompt = `Translate the following text from Russian into: en, tr, de, es, ar, fr.
Return ONLY a valid JSON object where keys are language codes and values are translated strings.
Do not include any explanation or markdown.
Text: "${text}"`;

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'google/gemini-2.0-flash-001',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' }
        }),
    });
    const data = await res.json();
    const content = data.choices[0].message.content;
    const json = JSON.parse(content);
    json.ru = text;
    return json;
}

async function main() {
    console.log('--- Translating Units ---');
    const { data: units } = await supabase.from('units').select('*');
    for (const unit of units) {
        if (!unit.title?.en || !unit.title?.tr) {
            console.log(`Translating unit: ${unit.title?.ru || unit.title}`);
            const tText = unit.title?.ru || unit.title;
            const dText = unit.description?.ru || unit.description;
            
            const titleTranslations = await translate(tText);
            const descTranslations = await translate(dText);
            
            await supabase.from('units').update({
                title: titleTranslations,
                description: descTranslations
            }).eq('id', unit.id);
            console.log('Done.');
        }
    }

    console.log('--- Translating FAQ ---');
    const { data: faqs } = await supabase.from('faq').select('*');
    for (const faq of faqs) {
        if (!faq.i18n?.questions?.en) {
            console.log(`Translating FAQ: ${faq.question}`);
            const qT = await translate(faq.question);
            const aT = await translate(faq.answer);
            
            await supabase.from('faq').update({
                i18n: {
                    questions: qT,
                    answers: aT
                }
            }).eq('id', faq.id);
            console.log('Done.');
        }
    }
}

main().catch(console.error);
