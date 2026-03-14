import { NextRequest, NextResponse } from "next/server";
import { askLLM } from "@/lib/gemini";

/**
 * API to translate lead data on the fly based on current dashboard language.
 * POST /api/translate { text: string | string[], target: 'ru' | 'en' | 'tr' }
 */
export async function POST(req: NextRequest) {
    try {
        const { text, target } = await req.json();

        if (!text || !target) {
            return NextResponse.json({ ok: false, error: "Text and target language are required." }, { status: 400 });
        }

        const targetNames: Record<string, string> = {
            ru: "Russian",
            en: "English",
            tr: "Turkish"
        };

        const targetLang = targetNames[target] || "English";

        const isArray = Array.isArray(text);
        const input = isArray ? text.join("\n---\n") : text;

        const system = `You are a professional translator for a real estate CRM. 
Translate the provided text into ${targetLang}. 
Maintain the tone (professional yet friendly). 
Maintain all formatting like line breaks. 
If input contains multiple blocks separated by '---', return them separated by '---' as well.`;

        const translated = await askLLM(input, system, true); // noJson = true

        let result;
        if (isArray) {
            result = translated.split("\n---\n").map(s => s.trim());
        } else {
            result = translated.trim();
        }

        return NextResponse.json({ ok: true, result });
    } catch (error: any) {
        console.error("Translation API error:", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
