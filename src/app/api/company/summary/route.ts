import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabaseClient';
import { askLLM } from '@/lib/openrouter';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const sb = getServerClient();

        // Fetch all active company knowledge
        const { data: entries, error } = await sb
            .from('company_files')
            .select('name, content_text')
            .eq('is_active', true);

        if (error) throw error;
        if (!entries || entries.length === 0) {
            return NextResponse.json({ ok: true, summary: "База знаний пуста." });
        }

        // Combine all content
        const combinedText = entries
            .map(e => `### ${e.name}\n${e.content_text || ''}`)
            .join('\n\n')
            .substring(0, 15000); // Protection against token limits

        const prompt = `Пожалуйста, составь единую, краткую и структурированную сводку о компании на основе следующих данных из базы знаний. 
Это должна быть "выжимка" самого важного для сотрудников или руководства.
Используй списки и четкие заголовки. 
Важно: пиши только на русском языке.

ДАННЫЕ:
${combinedText}`;

        const summary = await askLLM(prompt, "Ты ассистент, который делает идеальные резюме (summary) на основе больших объемов данных о компании.", true);

        return NextResponse.json({ ok: true, summary });

    } catch (e: any) {
        console.error('Summary generation error:', e);
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}
