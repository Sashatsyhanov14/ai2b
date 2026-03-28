import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabaseClient'
import { askLLM } from '@/lib/gemini'

type Params = { params: { id: string } }

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

export async function PATCH(req: Request, { params }: Params) {
  const body = await req.json()
  const sb = getServerClient()

  let patch = { ...body };

  // If the user is updating question or answer text, re-translate to English for the base field
  const ruQ = body.i18n?.ru?.question || body.question;
  const ruA = body.i18n?.ru?.answer || body.answer;

  if (ruQ || ruA) {
    const currentQ = ruQ || '';
    const currentA = ruA || '';
    const translations = await translateFaq(currentQ, currentA);

    patch = {
      ...patch,
      question: translations.en.question,
      answer: translations.en.answer,
      i18n: {
        ...(body.i18n || {}),
        ru: { ...(body.i18n?.ru || {}), ...(ruQ ? { question: ruQ } : {}), ...(ruA ? { answer: ruA } : {}) },
        en: translations.en,
        tr: translations.tr,
      }
    };
  }

  const { data, error } = await sb.from('faq').update(patch).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, data })
}

export async function DELETE(_req: Request, { params }: Params) {
  const sb = getServerClient()
  const { error } = await sb.from('faq').delete().eq('id', params.id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

