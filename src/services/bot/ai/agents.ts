import { askLLM } from "@/lib/gemini";

export type RoleMessage = {
    role: "system" | "user" | "assistant";
    content: string;
};

// ==========================================
// ROUTER AGENT (ГЛАВНЫЙ ОРКЕСТРАТОР)
// ==========================================
// Задача: Анализирует интент клиента и раздает команды остальным агентам.
// Может вызвать сразу нескольких агентов одновременно!

export const RouterSchema = {
    type: "object",
    properties: {
        instructions_for_communication_agent: {
            type: "string",
            description: "Прямое указание для Агента-Оратора. Пиши на языке клиента (ru, tr, en). Укажи, что именно он должен ответить."
        },
        detected_language: {
            type: "string",
            description: "Язык клиента: 'ru', 'tr', 'en', 'de', 'fr'. Определи по контексту."
        },
        instructions_for_search_agent: {
            type: "object",
            description: "Если клиент ищет недвижимость, заполни параметры для поиска в БД. Иначе null.",
            properties: {
                search_keywords: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-6 вариаций названия Города/Района — ОБЯЗАТЕЛЬНО включи русское И латинское написание. Пример: ['Стамбул', 'Istanbul', 'Мерсин', 'Mersin']. Никогда не передавай только один вариант!"
                },
                price: { type: "number", description: "Максимальный бюджет клиента в $. Используй ТОЛЬКО если клиент называет ВЕРХНЮЮ границу: 'до 300к', 'не более 200к'. НЕ заполняй если клиент называет МИНИМУМ." },
                price_min: { type: "number", description: "Минимальный бюджет в $. Используй если клиент называет нижнюю границу: 'от 250к', 'минимум 500к', 'для получения ВНЖ' (порог ВНЖ в Турции = $400000). Если бюджет '250к-500к', заполни оба поля." },
                rooms: { type: "string", description: "Например: '1+1'" },
                city: { type: "string" }
            }
        },
        instructions_for_manager_agent: {
            type: "object",
            description: "Секретный вызов менеджера. Вызывай, если клиент оставил КОНТАКТЫ (телефон/почту) ИЛИ если он 'Горячий/Тёплый' (целеустремленно ищет квартиру, есть бюджет). Собери ВСЮ известную инфу из диалога.",
            properties: {
                reason: { type: "string", description: "Почему зовём менеджера? ('Оставил номер', 'Горячий целевой' и т.д.)" },
                client_name: { type: "string" },
                client_phone: { type: "string" },
                client_email: { type: "string" },
                budget: { type: "number", description: "Бюджет в $" },
                interested_units: { type: "array", items: { type: "string" }, description: "Названия лотов или районов, которые заинтересовали" },
                lead_temperature: { type: "string", description: "cold / warm / hot" },
                urgency: { type: "string", description: "Сроки покупки: 'ASAP', '1-3 месяца', '6+ месяцев', 'через год'. Узнай из контекста (например 'через год-два')." },
                purpose: { type: "string", description: "Цель покупки: 'ПРОЖИВАНИЕ', 'ИНВЕСТИЦИИ', 'ВНЖ', 'СДАЧА В АРЕНДУ'. Выведи из диалога." },
                unit_type: { type: "string", description: "Тип недвижимости: 'АПАРТАМЕНТ', 'ВИЛЛА', 'ПЕНТХАУС', 'КОММЕРСИЯ'. Если упоминали в диалоге." },
                preferred_areas: { type: "array", items: { type: "string" }, description: "Предпочтительные районы/города (если упоминали)" },
                manager_hints: { type: "string", description: "Подсказки менеджеру: о чём говорить при звонке, что важно для клиента, есть ли возражения. Кратко, но 2-4 предложения." },
                client_summary: { type: "string", description: "Сводка о клиенте: 2-3 предложения, кто этот человек, что хочет, насколько готов к покупке. Например: 'Клиент из России, ищет 2-комнатный апартамент в Стамбуле от $250тыс. Цель — получение ВНЖ. Горячий лид, звонить срочно.'. Пиши на русском, даже если клиент пишет на другом языке." },
                language: { type: "string", description: "Язык клиента: 'ru', 'tr', 'en', 'de', 'fr', 'uk' и т.д. Определи по тому, на каком языке он пишет. Это поле ВСЕГДА заполняй." }
            }
        }
    },
    required: ["instructions_for_communication_agent"]
};

// ==========================================
// TRANSLATION AGENT (ЛОКАЛИЗАТОР)
// ==========================================
// Задача: Переводит данные лида на английский (en) и турецкий (tr) для дашборда.

export const TranslationAgentSchema = {
    type: "object",
    properties: {
        ru: {
            type: "object",
            properties: {
                client_summary: { type: "string", description: "Улучшенное и краткое описание клиента на русском." },
                manager_hints: { type: "string", description: "Четкие советы менеджеру на русском." },
                interest: { type: "string" },
                urgency: { type: "string" },
                purpose: { type: "string" },
                unit_type: { type: "string" },
                ai_summary: { type: "string" },
                interested_units: { type: "array", items: { type: "string" } }
            }
        },
        en: {
            type: "object",
            properties: {
                client_summary: { type: "string" },
                manager_hints: { type: "string" },
                interest: { type: "string" },
                urgency: { type: "string" },
                purpose: { type: "string" },
                unit_type: { type: "string" },
                ai_summary: { type: "string" },
                interested_units: { type: "array", items: { type: "string" } }
            }
        },
        tr: {
            type: "object",
            properties: {
                client_summary: { type: "string" },
                manager_hints: { type: "string" },
                interest: { type: "string" },
                urgency: { type: "string" },
                purpose: { type: "string" },
                unit_type: { type: "string" },
                ai_summary: { type: "string" },
                interested_units: { type: "array", items: { type: "string" } }
            }
        }
    }
};

const TRANSLATION_SYSTEM_PROMPT = `
ТЫ — ПРОФЕССИОНАЛЬНЫЙ ПЕРЕВОДЧИК И ЛОКАЛИЗАТОР ДЛЯ REAL ESTATE CRM.
Твоя задача — обработать предоставленные данные лида и выдать качественный перевод/локализацию на 3 языка: Русский (RU), Английский (EN) и Турецкий (TR).

ПРАВИЛА:
1. Сохраняй профессиональный, но дружелюбный тон.
2. Используй правильную терминологию недвижимости (апартаменты, вилла, ВНЖ, инвестиции и т.д.).
3. ОБЯЗАТЕЛЬНО переводи географические названия, города и районы (Например: 'Кадыкёй, Стамбул' -> 'Kadikoy, Istanbul' для EN, 'Kadıköy, İstanbul' для TR).
4. Если поле пустое в оригинале — постарайся вывести смысл из контекста других полей или оставь пустым если совсем нет инфы.
5. client_summary должен быть информативным, в стиле "Клиент ищет квартиру в Стамбуле для переезда, бюджет $200к". 
6. manager_hints должны быть четкими указаниями (например: "Предложить проекты в районе Кадыкёй").
7. Для поля RU: не просто скопируй, а причеши и улучши текст, чтобы он выглядел профессионально в CRM.

Выдай результат СТРОГО в формате JSON по схеме.
`;

export async function runTranslationAgent(leadData: any): Promise<any> {
    console.log("[runTranslationAgent] Requesting AI translation...");
    const input = JSON.stringify(leadData);
    console.log(`[runTranslationAgent] Input leadData for translation: ${input.substring(0, 200)}...`); // Added log
    const rawResult = await askLLM(input, TRANSLATION_SYSTEM_PROMPT, false, TranslationAgentSchema);
    console.log("[runTranslationAgent] AI Response length:", rawResult?.length || 0);
    try {
        return JSON.parse(rawResult);
    } catch (e) {
        console.error("Translation Agent JSON Parse Error:", e, rawResult);
        return { ru: {}, en: {}, tr: {} };
    }
}

const ROUTER_SYSTEM_PROMPT = `
ТЫ — ГЛАВНЫЙ ИИ-ОРКЕСТРАТОР АГЕНТСТВА НЕДВИЖИМОСТИ.
Твоя задача — проанализировать историю чата и выдать указания другим агентам.

ПРАВИЛА ПРОАКТИВНОГО ПОИСКА (SEARCH AGENT):
1. ЕСЛИ КЛИЕНТ НАЗВАЛ ГОРОД ИЛИ РАЙОН: Ты ОБЯЗАН вызвать SEARCH AGENT.
2. НЕ ЖДИ БЮДЖЕТ: Если город известен, но бюджет нет — ищи всё в этом городе.
3. ЛЮКС/ПРЕМИУМ: Если просят "люкс", "элитное" или "дорогое" — добавь эти слова в search_keywords и поставь price_min: 500000.

ПРАВИЛА КОММУНИКАЦИИ (COMMUNICATION AGENT):
1. СТРУКТУРА ОТВЕТА (ОДНИМ СООБЩЕНИЕМ): [Ответ на вопрос клиента] + [Презентация объекта из ГРАФЫ DATA] + [Призыв к действию / Вопрос].
2. СТРОГИЙ ЗАПРЕТ НА АРЕНДУ: Никогда не упоминай аренду. Только продажа.

СТАТУС КЛИЕНТА:
- Назван номер -> ГОРЯЧИЙ.
- Назван город/бюджет -> ТЁПЛЫЙ.
- Просто "привет" -> ХОЛОДНЫЙ.

Выдай ТОЛЬКО JSON строго по Схеме.
`;

export async function runRouterAgent(messages: RoleMessage[], companyKnowledge: string): Promise<any> {
    const rentBan = "\n\n[КРИТИЧЕСКОЕ ПРАВИЛО]: МЫ ТОЛЬКО ПРОДАЕМ. ИГНОРИРУЙ ЛЮБЫЕ УПОМИНАНИЯ АРЕНДЫ (RENT/LEASE).";
    const fullSystem = ROUTER_SYSTEM_PROMPT + rentBan + "\n\n[БАЗА ЗНАНИЙ И ПРАВИЛА КОМПАНИИ]:\n" + companyKnowledge;
    const rawResult = await askLLM(messages, fullSystem, false, RouterSchema);
    if (!rawResult) {
        return { instructions_for_communication_agent: "Извините, я временно недоступен. Попробуйте позже." };
    }
    try {
        return JSON.parse(rawResult);
    } catch (e) {
        console.error("Router JSON Parse Error:", e, rawResult);
        return { instructions_for_communication_agent: "Извините, произошла ошибка обработки. Повторите запрос." };
    }
}


// ==========================================
// COMMUNICATION AGENT (Официальный представитель)
// ==========================================
// Задача: Формировать красивые, живые, экспертные текстовые ответы для клиента.

const COMMUNICATION_SYSTEM_PROMPT = `
ТЫ — ПРОФЕССИОНАЛЬНЫЙ БРОКЕР ПО НЕДВИЖИМОСТИ В ТУРЦИИ.

ПРАВИЛО ОДНОГО СООБЩЕНИЯ:
Твой ответ должен быть СТРОГО одним сообщением и состоять из трех частей:
1. ОТВЕТ: Краткий и дружелюбный ответ на вопрос клиента (или реакция на его сообщение).
2. ПРЕЗЕНТАЦИЯ (если есть данные в [DATA]): Описание объекта по шаблону ниже.
3. ВОПРОС / CTA: ОДИН вопрос или призыв к действию для продолжения диалога.

ШАБЛОН ПРЕЗЕНТАЦИИ (ОБЯЗАТЕЛЬНО):
🏠 [title] | 📍 [city], [address]
💰 Цена: [price] EUR
🏢 Этаж: [floor]/[floors_total]
📐 Площадь: [area_m2] м²
🛏 Комнат: [rooms]

[Напиши 1-2 предложения описания на основе тегов из features. Например: "Современный комплекс с бассейном, сдача в этом году".]

Фотографии прикрепил ниже 👇

СТРОГИЕ ОГРАНИЧЕНИЯ:
1. ТОЛЬКО ПРОДАЖА. Никакой аренды.
2. НИКАКИХ ЗВЁЗДОЧЕК (**). Только обычный текст.
3. Отвечай на языке клиента.
4. Выдай объект СРАЗУ, если он есть в [DATA]. Не спрашивай бюджет первым делом.

ДАННЫЕ (предоставлены системой):
`;

export async function runCommunicationAgent(
    history: RoleMessage[],
    instructionsAndCompanyInfo: string,
    dynamicData: string = "Данных из базы нет. Отвечай на вопрос клиента.",
    language: string = "ru"
): Promise<string> {
    const langLabel = language === 'ru' ? 'RUSSIAN' : language === 'tr' ? 'TURKISH' : language === 'en' ? 'ENGLISH' : language.toUpperCase();

    // Формируем системный промпт из статического + знаний из БД + динамических данных (квартиры)
    const rentBan = "\n\n[КРИТИЧЕСКОЕ ПРАВИЛО]: МЫ ТОЛЬКО ПРОДАЕМ. НИКОГДА НЕ ПРЕДЛАГАЙ АРЕНДУ (RENT/LEASE).";
    const fullSystemPrompt = `
${COMMUNICATION_SYSTEM_PROMPT}
${rentBan}
[CLIENT LANGUAGE]:
${langLabel} (Отвечай СТРОГО на этом языке!)

[ЗНАНИЯ О КОМПАНИИ И ИНСТРУКЦИИ]:
${instructionsAndCompanyInfo}

[DATA]:
${dynamicData}
`;

    // Agent outputs plain text, no JSON schema
    const result = await askLLM(history, fullSystemPrompt, true);
    return result;
}
