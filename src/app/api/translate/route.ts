import { NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001';

export async function POST(req: Request) {
    try {
        const { text } = await JSON.parse(await req.text());
        if (!text) return NextResponse.json({ error: 'No text' }, { status: 400 });

        const targetLangs = ['ru', 'en', 'tr', 'de', 'es', 'ar', 'fr'];
        const prompt = `Translate the following text into these languages: ${targetLangs.join(', ')}. 
Detect the source language automatically. 
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
        
        if (!data.choices || data.choices.length === 0) {
            console.error('OpenRouter error or empty choices:', data);
            throw new Error(data.error?.message || 'Failed to get translation from AI');
        }

        const content = data.choices[0].message.content;
        const translations = JSON.parse(content);



        return NextResponse.json(translations);
    } catch (error: any) {
        console.error('Translation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
