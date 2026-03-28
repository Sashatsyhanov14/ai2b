import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabaseClient'
import { askLLM } from '@/lib/gemini'

export async function GET() {
  const sb = getServerClient()
  const { data, error } = await sb.from('faq').select('*').order('sort_order', { ascending: true })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, data })
}

async function translateFaq(question: string, answer: string): Promise<{ en: { question: string; answer: string }; tr: { question: string; answer: string } }> {
  const fallback = { en: { question, answer }, tr: { question, answer } };
  try {
    const prompt = `Translate the following FAQ question and answer to both English (en) and Turkish (tr). Return ONLY a JSON object with this exact structure: {"en":{"question":"...","answer":"..."},"tr":{"question":"...","answer":"..."}}. No markdown, no explanation.\n\nInput:\n${JSON.stringify({ question, answer })}`;
    const raw = await askLLM(prompt, 'You are a professional multilingual translator. Output only valid JSON.', false, undefined, 'gemini-1.5-flash');
    const parsed = JSON.parse(raw);
    return {
      en: { question: parsed.en?.question || question, answer: parsed.en?.answer || answer },
      tr: { question: parsed.tr?.question || question, answer: parsed.tr?.answer || answer },
    };
  } catch {
    return fallback;
  }
}

export async function POST(req: Request) {
  const body = await req.json()
  const sb = getServerClient()

  // Detect the source text (ru i18n or raw fields)
  const ruQ = body.i18n?.ru?.question || body.question || '';
  const ruA = body.i18n?.ru?.answer || body.answer || '';

  // Auto-translate to English + Turkish
  const translations = await translateFaq(ruQ, ruA);

  const payload = {
    ...body,
    question: translations.en.question,   // Base field = English for AI
    answer: translations.en.answer,
    i18n: {
      ...(body.i18n || {}),
      ru: { question: ruQ, answer: ruA },
      en: translations.en,
      tr: translations.tr,
    }
  };

  const { data, error } = await sb.from('faq').insert(payload).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, data })
}

