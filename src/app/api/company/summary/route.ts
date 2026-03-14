import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabaseClient';
import { askLLM } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const lang = searchParams.get('lang') || 'ru';
        const langLabel = lang === 'tr' ? 'TURKISH' : lang === 'en' ? 'ENGLISH' : 'RUSSIAN';

        const sb = getServerClient();

        // Fetch all active company knowledge
        const { data: entries, error } = await sb
            .from('company_files')
            .select('name, content_text')
            .eq('is_active', true);

        if (error) throw error;

        // Fetch Global Instructions (structured)
        const { data: rules } = await sb
            .from('bot_instructions')
            .select('text')
            .eq('is_active', true)
            .order('created_at', { ascending: true });

        let globalInstructions = "";
        if (rules && rules.length > 0) {
            globalInstructions = rules
                .map((r, i) => `${i + 1}. ${r.text}`)
                .join("\n");
        }

        if (!entries || entries.length === 0) {
            return NextResponse.json({ ok: true, summary: "База знаний пуста." });
        }

        const combinedText = entries
            .map(e => `### ${e.name}\n${e.content_text || ''}`)
            .join('\n\n')
            .substring(0, 15000); // Protection against token limits

        const prompt = `Please provide a unified, concise, and structured summary of the company based on the following knowledge base data.
The summary MUST be written in ${langLabel}.

This should be a "gist" of the most important information for employees or management.
Use lists and clear headings. 

IN THE GLOBAL INSTRUCTIONS BELOW, THERE MAY BE RULES ON HOW TO STRUCTURE OR WHAT TONE TO USE. OBSERVE THEM.

GLOBAL INSTRUCTIONS:
${globalInstructions}

KNOWLEDGE BASE DATA:
${combinedText}`;

        const summary = await askLLM(prompt, `You are an assistant analyzing a knowledge base and composing summaries in ${langLabel} according to global company rules.`, true);

        return NextResponse.json({ ok: true, summary });

    } catch (e: any) {
        console.error('[API/Summary] Unexpected Error:', e);
        return NextResponse.json({ ok: false, error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
