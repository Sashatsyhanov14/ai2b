import { NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001';

export async function POST(req: Request) {
    try {
        const { text, targetLangs = ['en', 'tr', 'de', 'es', 'ar', 'fr'] } = await JSON.parse(await req.text());

        if (!text) {
            return NextResponse.json({ error: 'No text provided' }, { status: 400 });
        }

        const prompt = `Translate the following text from Russian into these languages: ${targetLangs.join(', ')}.
Return ONLY a valid JSON object where keys are language codes and values are translated strings.
Do not include any explanation or markdown.

Text: "${text}"`;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://estate.ticaretai.tr',
                'X-Title': 'Estate Bot Translation',
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' }
            }),
        });

        const data = await response.json();
        const content = data.choices[0].message.content;
        const translations = JSON.parse(content);

        // Include original RU
        translations.ru = text;

        return NextResponse.json(translations);
    } catch (error: any) {
        console.error('Translation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
