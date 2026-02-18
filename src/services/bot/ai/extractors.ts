import { askLLM } from "@/lib/openrouter";
import { Lang } from "../types";

// =====================================================
// EXTRACT SEARCH PARAMS
// =====================================================
export async function extractSearchParamsAI(queryText: string, lang: Lang): Promise<{
    city_variants: string[];
    price_max: number | null;
    rooms: number | null;
}> {
    const prompt = `
Ты извлекаешь параметры поиска из запроса пользователя для базы данных SQL.

Запрос: "${queryText}"
Язык пользователя: ${lang}

ЗАДАЧА: Если упомянут город, верни ВСЕ возможные варианты его написания (на русском, английском, сокращения).

ПРИМЕРЫ:
- "Питер" -> ["Санкт-Петербург", "Санкт Петербург", "СПб", "Saint Petersburg", "Petersburg", "Piter"]
- "Мск" -> ["Москва", "Moscow", "Мск", "MSK"]
- "Алания" -> ["Alanya", "Алания", "Аланья"]
- "Стамбул" -> ["Istanbul", "Стамбул", "İstanbul"]

Если бюджет не указан -> ставь null.
Rooms: 0=Studio, 1=1+1, 2=2+1, 3=3+1, etc.

Верни JSON:
{ 
  "city_variants": ["вариант1", "вариант2", ...] или [],
  "price_max": number | null, 
  "rooms": number | null
}
`;

    try {
        const raw = await askLLM(prompt, "System: Parameter Extractor", true);
        const json = JSON.parse(raw);
        return {
            city_variants: json.city_variants || [],
            price_max: json.price_max || null,
            rooms: json.rooms !== undefined ? json.rooms : null
        };
    } catch (e) {
        console.error("extractSearchParamsAI error:", e);
        return { city_variants: [], price_max: null, rooms: null };
    }
}

// =====================================================
// LEAD ANALYST
// =====================================================
type AnalystResult = {
    is_lead: boolean;
    lead_status: "COLD" | "WARM" | "HOT";
    user_intent: string;
    missing_info: string[];
};

export async function analyzeLeadAI(history: string): Promise<AnalystResult> {
    const prompt = `
ТЫ — ГЛАВНЫЙ CRM-АНАЛИТИК.
Твоя задача: Читать переписку с клиентом и оценивать качество Лида.

ВХОДНЫЕ ДАННЫЕ (ИСТОРИЯ ЧАТА):
"""
${history}
"""

ПРОАНАЛИЗИРУЙ И ВЕРНИ СТРОГО JSON:
{
  "is_lead": true/false,          // Ставь true, если есть ХОТЬ МАЛЕЙШИЙ интерес к недвижимости (цена, город, фото)
  "lead_status": "COLD" | "WARM" | "HOT", // COLD - просто привет/спам, WARM - смотрит варианты, HOT - оставил контакт или просит встречу/звонок
  "user_intent": "строка",        // Что он хочет? (Например: "Купить двушку в Питере")
  "missing_info": ["budget", "phone", ...] // Чего не хватает для продажи?
}
`;

    try {
        const raw = await askLLM(prompt, "System: CRM Analyst", true);
        return JSON.parse(raw);
    } catch (e) {
        console.error("analyzeLeadAI error:", e);
        return { is_lead: false, lead_status: "COLD", user_intent: "Error", missing_info: [] };
    }
}

// =====================================================
// LEAD QUALIFICATION
// =====================================================
export async function qualifyLeadAI(history: string, lang: Lang): Promise<{
    is_trash: boolean;
    summary: string;
    budget: string;
    location: string;
    type: string;
    urgency: string;
} | null> {
    const prompt = `Ты — CRM - аналитик.Твоя задача — извлечь данные из диалога для менеджера по недвижимости.

ВХОДНЫЕ ДАННЫЕ:
История чата:
      """
${history}
      """
Язык пользователя: ${lang}

ПРОАНАЛИЗИРУЙ И ВЕРНИ JSON(СТРОГО):
      {
        "is_trash": true / false, // Если это спам или просто "привет", ставь true
          "summary": "Краткая выжимка в 1 предложение (на русском)",
            "budget": "сумма или 'не указан'",
              "location": "город/район или 'не указан'",
                "type": "buy/rent/invest",
                  "urgency": "hot/warm/cold"
      }
      `;

    try {
        const raw = await askLLM(prompt, "Ты — эксперт CRM, анализирующий диалоги и создающий карточки лидов для менеджеров по недвижимости.", true);
        let jsonText = raw.trim();
        const firstBrace = jsonText.indexOf("{");
        const lastBrace = jsonText.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            jsonText = jsonText.slice(firstBrace, lastBrace + 1);
        }
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("qualifyLeadAI error:", e);
        return null;
    }
}
